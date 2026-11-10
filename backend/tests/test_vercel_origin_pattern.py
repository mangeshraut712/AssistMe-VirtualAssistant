from app.origins import origin_is_allowed


def test_vercel_git_branch_previews_are_team_pinned() -> None:
    assert origin_is_allowed("https://assist-me-virtual-assistant.vercel.app") is True
    assert origin_is_allowed(
        "https://assist-me-virtual-assistant-git-fix-cors-mangeshraut712.vercel.app"
    ) is True
    assert origin_is_allowed(
        "https://assist-me-virtual-assistant-git-fix-cors-otherteam.vercel.app"
    ) is False
    assert origin_is_allowed("https://assist-me-virtual-assistant-abc123.vercel.app") is False
    assert origin_is_allowed("https://evil-assist-me-virtual-assistant.vercel.app") is False
