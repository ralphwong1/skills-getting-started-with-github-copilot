import json
from fastapi.testclient import TestClient

from src.app import app, activities

client = TestClient(app)


def test_get_activities_returns_dict():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # ensure a known activity exists
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "teststudent@example.com"

    # ensure test email not already present
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # sign up
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    assert res.json()["message"] == f"Signed up {email} for {activity}"
    assert email in activities[activity]["participants"]

    # signing up again should fail with 400
    res2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert res2.status_code == 400

    # unregister
    res3 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res3.status_code == 200
    assert res3.json()["message"] == f"Unregistered {email} from {activity}"
    assert email not in activities[activity]["participants"]

    # unregistering again should fail
    res4 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res4.status_code == 400
