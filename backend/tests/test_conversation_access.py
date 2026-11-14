"""Synthetic database only: saved chat history must be owner-scoped."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main
from app.core.security import create_access_token
from app.database import Base, get_db
from app.models import Conversation, Message, User


@pytest.fixture
def history_client():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as db:
        alice = User(username='alice', email='alice@example.test', hashed_password='unused')
        bob = User(username='bob', email='bob@example.test', hashed_password='unused')
        db.add_all([alice, bob])
        db.flush()
        rows = [Conversation(user_id=alice.id, title='Alice synthetic'),
                Conversation(user_id=bob.id, title='Bob synthetic'),
                Conversation(title='Legacy synthetic')]
        db.add_all(rows)
        db.flush()
        db.add_all([Message(conversation_id=row.id, role='user', content=row.title) for row in rows])
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
    return {'Authorization': 'Bearer ' + create_access_token(name)}


@pytest.mark.parametrize('path', ['/api/conversations', '/api/conversations/1'])
def test_history_requires_authentication(history_client, path):
    client, _, _ = history_client
    assert client.get(path).status_code == 401


def test_history_list_only_returns_owner(history_client):
    client, _, rows = history_client
    result = client.get('/api/conversations', headers=bearer('alice'))
    assert result.status_code == 200
    assert [row['id'] for row in result.json()] == [rows[0].id]


@pytest.mark.parametrize('index', [1, 2])
def test_other_owner_and_legacy_detail_are_hidden(history_client, index):
    client, _, rows = history_client
    assert client.get(f'/api/conversations/{rows[index].id}', headers=bearer('alice')).status_code == 404


def test_owner_can_read_own_history(history_client):
    client, _, rows = history_client
    result = client.get(f'/api/conversations/{rows[0].id}', headers=bearer('alice'))
    assert result.status_code == 200
    assert result.json()['messages'][0]['content'] == 'Alice synthetic'


@pytest.mark.parametrize('authorization', ['Bearer invalid', 'Basic nope'])
def test_invalid_authentication_rejected(history_client, authorization):
    client, _, _ = history_client
    assert client.get('/api/conversations', headers={'Authorization': authorization}).status_code == 401


def test_deleted_user_rejected(history_client):
    client, _, _ = history_client
    assert client.get('/api/conversations', headers=bearer('deleted')).status_code == 401


@pytest.fixture
def chat_ready(monkeypatch):
    async def allowed(*args):
        return True, ''
    monkeypatch.setattr(main.rate_limit_service, 'check_rate_limit', allowed)
    monkeypatch.setattr(main.rate_limit_service, 'check_credits', allowed)
    monkeypatch.setattr(main, '_ensure_chat_client', lambda: None)
    monkeypatch.setattr(main, 'get_provider', lambda: object())
    monkeypatch.setattr(main, 'CHAT_CLIENT_AVAILABLE', True)


@pytest.mark.parametrize('path', ['/api/chat', '/api/chat/stream'])
@pytest.mark.parametrize('identity,index', [(None, 0), ('alice', 1), ('alice', 2)])
def test_chat_cannot_reuse_unowned_history(history_client, chat_ready, path, identity, index):
    client, db, rows = history_client
    before = db.query(Message).count()
    # If unauthorized context reaches model processing, fail before any external call.
    async def no_model_access(*args, **kwargs):
        raise AssertionError('Unauthorized history reached model pipeline')
    from unittest.mock import patch
    with patch.object(main, '_detect_and_adapt_language', no_model_access):
        result = client.post(path, headers=bearer(identity) if identity else {}, json={
            'messages': [{'role': 'user', 'content': 'synthetic request'}],
            'conversation_id': rows[index].id,
        })
    assert result.status_code == (401 if identity is None else 404)
    assert db.query(Message).count() == before


def test_anonymous_context_does_not_persist(history_client):
    _, db, _ = history_client
    from app.schemas import TextChatRequest
    request = TextChatRequest(messages=[{'role': 'user', 'content': 'synthetic anonymous'}])
    before = db.query(Conversation).count()
    conversation_id, messages = main._prepare_conversation_context(request, db)
    assert conversation_id is None
    assert messages == [{'role': 'user', 'content': 'synthetic anonymous'}]
    assert db.query(Conversation).count() == before


def test_signed_in_context_keeps_owner_and_history(history_client):
    _, db, rows = history_client
    from app.schemas import TextChatRequest
    user = db.query(User).filter_by(username='alice').one()
    request = TextChatRequest(messages=[{'role': 'user', 'content': 'new synthetic'}], conversation_id=rows[0].id)
    conversation_id, messages = main._prepare_conversation_context(request, db, user)
    assert conversation_id == rows[0].id
    assert [message['content'] for message in messages] == ['Alice synthetic', 'new synthetic']
    request.conversation_id = None
    conversation_id, _ = main._prepare_conversation_context(request, db, user)
    assert db.get(Conversation, conversation_id).user_id == user.id


@pytest.mark.parametrize('path', ['/api/chat', '/api/chat/stream'])
def test_chat_invalid_token_is_not_anonymous(history_client, path):
    client, _, _ = history_client
    result = client.post(path, headers={'Authorization': 'Bearer invalid'}, json={
        'messages': [{'role': 'user', 'content': 'synthetic'}],
    })
    assert result.status_code == 401


@pytest.mark.parametrize('path', ['/api/chat', '/api/chat/stream'])
@pytest.mark.parametrize('identity', [None, 'alice'])
def test_chat_preserves_completion_and_only_persists_signed_in(history_client, chat_ready, monkeypatch, path, identity):
    client, db, _ = history_client
    before = db.query(Conversation).count()
    async def detect(messages, **kwargs):
        return messages, 'en'
    async def augment(messages):
        return messages
    async def record(*args):
        pass
    class SyntheticProvider:
        async def chat_completion(self, **kwargs):
            assert kwargs['messages'] == [{'role': 'user', 'content': 'synthetic new chat'}]
            if kwargs['stream']:
                async def chunks():
                    yield {'content': 'synthetic answer'}
                return chunks()
            return {'response': 'synthetic answer', 'tokens': 2}
    monkeypatch.setattr(main, '_detect_and_adapt_language', detect)
    monkeypatch.setattr(main, '_augment_with_rag_context', augment)
    monkeypatch.setattr(main.rate_limit_service, 'record_request', record)
    monkeypatch.setattr(main, 'get_provider', SyntheticProvider)
    result = client.post(path, headers=bearer(identity) if identity else {}, json={
        'messages': [{'role': 'user', 'content': 'synthetic new chat'}],
    })
    assert result.status_code == 200
    assert 'synthetic answer' in result.text
    assert db.query(Conversation).count() == before + (1 if identity else 0)
    if identity:
        new = db.query(Conversation).order_by(Conversation.id.desc()).first()
        assert new.user_id == db.query(User).filter_by(username=identity).one().id
        assert [m.content for m in new.messages] == ['synthetic new chat', 'synthetic answer']


def test_expired_token_cannot_read_history(history_client):
    from datetime import timedelta
    client, _, _ = history_client
    token = create_access_token('alice', expires_delta=timedelta(seconds=-60))
    assert client.get('/api/conversations', headers={'Authorization': 'Bearer ' + token}).status_code == 401


def test_authenticated_history_fails_closed_without_database(history_client):
    client, _, _ = history_client
    def unavailable_database():
        yield None
    main.app.dependency_overrides[get_db] = unavailable_database
    assert client.get('/api/conversations', headers=bearer('alice')).status_code == 503
    for path in ['/api/chat', '/api/chat/stream']:
        result = client.post(path, headers=bearer('alice'), json={
            'messages': [{'role': 'user', 'content': 'synthetic'}],
        })
        assert result.status_code == 503
