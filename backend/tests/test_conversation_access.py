"""Synthetic database only: saved chat history must be owner-scoped."""
# pylint: disable=redefined-outer-name,protected-access,unused-argument,too-few-public-methods
import secrets
from datetime import timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main
from app.core.security import create_access_token
from app.database import Base, get_db
from app.models import Conversation, Message, User
from app.schemas import TextChatRequest


@pytest.fixture
def history_client():
    """Create test client and synthetic conversation rows for testing."""
    engine = create_engine(
        'sqlite://',
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as db:
        alice = User(
            username='alice',
            email='alice@example.test',
            hashed_password=secrets.token_hex(16),
        )
        bob = User(
            username='bob',
            email='bob@example.test',
            hashed_password=secrets.token_hex(16),
        )
        db.add_all([alice, bob])
        db.flush()
        rows = [
            Conversation(user_id=alice.id, title='Alice synthetic'),
            Conversation(user_id=bob.id, title='Bob synthetic'),
            Conversation(title='Legacy synthetic'),
        ]
        db.add_all(rows)
        db.flush()
        db.add_all([
            Message(conversation_id=row.id, role='user', content=row.title)
            for row in rows
        ])
        db.commit()

        def database():
            yield db

        main.app.dependency_overrides[get_db] = database
        try:
            yield TestClient(main.app), db, rows
        finally:
            main.app.dependency_overrides.clear()
    engine.dispose()


def bearer(name):
    """Generate authorization header with bearer token for username."""
    return {'Authorization': 'Bearer ' + create_access_token(name)}


@pytest.mark.parametrize('path', ['/api/conversations', '/api/conversations/1'])
def test_history_requires_authentication(history_client, path):
    """Unauthenticated conversation history access returns 401."""
    client, _, _ = history_client
    assert client.get(path).status_code == 401


def test_history_list_only_returns_owner(history_client):
    """Listing conversations returns only the authenticated user's records."""
    client, _, rows = history_client
    result = client.get('/api/conversations', headers=bearer('alice'))
    assert result.status_code == 200
    assert [row['id'] for row in result.json()] == [rows[0].id]


@pytest.mark.parametrize('index', [1, 2])
def test_other_owner_and_legacy_detail_are_hidden(history_client, index):
    """Other users' conversations and unowned legacy conversations return 404."""
    client, _, rows = history_client
    res = client.get(
        f'/api/conversations/{rows[index].id}',
        headers=bearer('alice'),
    )
    assert res.status_code == 404


def test_owner_can_read_own_history(history_client):
    """Conversation owner can read their own conversation messages."""
    client, _, rows = history_client
    result = client.get(
        f'/api/conversations/{rows[0].id}',
        headers=bearer('alice'),
    )
    assert result.status_code == 200
    assert result.json()['messages'][0]['content'] == 'Alice synthetic'


@pytest.mark.parametrize('authorization', ['Bearer invalid', 'Basic nope'])
def test_invalid_authentication_rejected(history_client, authorization):
    """Invalid token or unsupported auth scheme returns 401."""
    client, _, _ = history_client
    headers = {'Authorization': authorization}
    assert client.get('/api/conversations', headers=headers).status_code == 401


def test_deleted_user_rejected(history_client):
    """Valid token for non-existent user returns 401."""
    client, _, _ = history_client
    res = client.get('/api/conversations', headers=bearer('deleted'))
    assert res.status_code == 401


@pytest.fixture
def chat_ready(monkeypatch):
    """Stub out model and provider requirements for chat tests."""
    async def allowed(*args):
        return True, ''

    def noop_client():
        return None

    def empty_provider():
        return object()

    monkeypatch.setattr(main.rate_limit_service, 'check_rate_limit', allowed)
    monkeypatch.setattr(main.rate_limit_service, 'check_credits', allowed)
    monkeypatch.setattr(main, '_ensure_chat_client', noop_client)
    monkeypatch.setattr(main, 'get_provider', empty_provider)
    monkeypatch.setattr(main, 'CHAT_CLIENT_AVAILABLE', True)


@pytest.mark.parametrize('path', ['/api/chat', '/api/chat/stream'])
@pytest.mark.parametrize('identity,index', [
    (None, 0), ('alice', 1), ('alice', 2),
])
def test_chat_cannot_reuse_unowned_history(
    history_client, chat_ready, path, identity, index,
):
    """Chat endpoints prevent reusing unowned or anonymous history."""
    client, db, rows = history_client
    before = db.query(Message).count()

    async def no_model_access(*args, **kwargs):
        raise AssertionError('Unauthorized history reached model pipeline')

    with patch.object(main, '_detect_and_adapt_language', no_model_access):
        result = client.post(
            path,
            headers=bearer(identity) if identity else {},
            json={
                'messages': [{'role': 'user', 'content': 'synthetic request'}],
                'conversation_id': rows[index].id,
            },
        )
    assert result.status_code == (401 if identity is None else 404)
    assert db.query(Message).count() == before


def test_anonymous_context_does_not_persist(history_client):
    """Anonymous chat requests do not persist conversation rows in database."""
    _, db, _ = history_client
    request = TextChatRequest(
        messages=[{'role': 'user', 'content': 'synthetic anonymous'}],
    )
    before = db.query(Conversation).count()
    conversation_id, messages = main._prepare_conversation_context(request, db)
    assert conversation_id is None
    assert messages == [{'role': 'user', 'content': 'synthetic anonymous'}]
    assert db.query(Conversation).count() == before


def test_signed_in_context_keeps_owner_and_history(history_client):
    """Signed-in chat context assigns ownership and loads history correctly."""
    _, db, rows = history_client
    user = db.query(User).filter_by(username='alice').one()
    request = TextChatRequest(
        messages=[{'role': 'user', 'content': 'new synthetic'}],
        conversation_id=rows[0].id,
    )
    conversation_id, messages = main._prepare_conversation_context(
        request, db, user,
    )
    assert conversation_id == rows[0].id
    assert [m['content'] for m in messages] == [
        'Alice synthetic', 'new synthetic',
    ]
    request.conversation_id = None
    conversation_id, _ = main._prepare_conversation_context(request, db, user)
    assert db.get(Conversation, conversation_id).user_id == user.id


@pytest.mark.parametrize('path', ['/api/chat', '/api/chat/stream'])
def test_chat_invalid_token_is_not_anonymous(history_client, path):
    """Chat request with invalid token fails with 401 instead of anonymous."""
    client, _, _ = history_client
    result = client.post(
        path,
        headers={'Authorization': 'Bearer invalid'},
        json={'messages': [{'role': 'user', 'content': 'synthetic'}]},
    )
    assert result.status_code == 401


@pytest.mark.parametrize('path', ['/api/chat', '/api/chat/stream'])
@pytest.mark.parametrize('identity', [None, 'alice'])
def test_chat_preserves_completion_and_only_persists_signed_in(
    history_client, chat_ready, monkeypatch, path, identity,
):
    """Chat succeeds for both anonymous and signed-in, but persists only for signed-in."""
    client, db, _ = history_client
    before = db.query(Conversation).count()

    async def detect(messages, **kwargs):
        return messages, 'en'

    async def augment(messages):
        return messages

    async def record(*args):
        pass

    class SyntheticProvider:
        """Synthetic AI provider for chat completion tests."""

        async def chat_completion(self, **kwargs):
            """Return synthetic chat completion chunks or payload."""
            assert kwargs['messages'] == [{
                'role': 'user', 'content': 'synthetic new chat',
            }]
            if kwargs['stream']:
                async def chunks():
                    yield {'content': 'synthetic answer'}
                return chunks()
            return {'response': 'synthetic answer', 'tokens': 2}

    monkeypatch.setattr(main, '_detect_and_adapt_language', detect)
    monkeypatch.setattr(main, '_augment_with_rag_context', augment)
    monkeypatch.setattr(main.rate_limit_service, 'record_request', record)
    monkeypatch.setattr(main, 'get_provider', SyntheticProvider)
    result = client.post(
        path,
        headers=bearer(identity) if identity else {},
        json={'messages': [{'role': 'user', 'content': 'synthetic new chat'}]},
    )
    assert result.status_code == 200
    assert 'synthetic answer' in result.text
    assert db.query(Conversation).count() == before + (1 if identity else 0)
    if identity:
        new = db.query(Conversation).order_by(Conversation.id.desc()).first()
        user_row = db.query(User).filter_by(username=identity).one()
        assert new.user_id == user_row.id
        assert [m.content for m in new.messages] == [
            'synthetic new chat', 'synthetic answer',
        ]


def test_expired_token_cannot_read_history(history_client):
    """Expired access token is rejected with 401 when reading history."""
    client, _, _ = history_client
    token = create_access_token('alice', expires_delta=timedelta(seconds=-60))
    res = client.get(
        '/api/conversations',
        headers={'Authorization': 'Bearer ' + token},
    )
    assert res.status_code == 401


def test_authenticated_history_fails_closed_without_database(history_client):
    """Database unavailability causes history endpoints to fail closed with 503."""
    client, _, _ = history_client

    def unavailable_database():
        yield None

    main.app.dependency_overrides[get_db] = unavailable_database
    res = client.get('/api/conversations', headers=bearer('alice'))
    assert res.status_code == 503
    for path in ['/api/chat', '/api/chat/stream']:
        result = client.post(path, headers=bearer('alice'), json={
            'messages': [{'role': 'user', 'content': 'synthetic'}],
        })
        assert result.status_code == 503
