import json
import csv
from pathlib import Path
import httpx

BASE_URL = "http://127.0.0.1:8000"
USERNAME = "administrator"
PASSWORD = "P@ssw0rd!ng"

OUTPUT_DIR = Path(__file__).resolve().parent


def write_json(data, path: Path) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_csv(records, path: Path, field_order=None) -> None:
    if not records:
        path.write_text("")
        return
    if field_order is None:
        # Flatten dict if nested values exist
        field_order = list(records[0].keys())
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=field_order)
        writer.writeheader()
        for rec in records:
            # Convert lists to semicolon-joined strings for CSV
            row = {k: (";".join(v) if isinstance(v, list) else v) for k, v in rec.items()}
            writer.writerow(row)


def main():
    with httpx.Client(base_url=BASE_URL, follow_redirects=True, timeout=30.0) as client:
        # Authenticate
        login_res = client.post(
            "/api/auth/login",
            json={"username": USERNAME, "password": PASSWORD},
        )
        login_res.raise_for_status()
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Fetch datasets
        users = client.get("/api/users", headers=headers).json()
        groups = client.get("/api/groups", headers=headers).json()
        ous = client.get("/api/ous", headers=headers).json()

        # Write JSON
        write_json(users, OUTPUT_DIR / "users.json")
        write_json(groups, OUTPUT_DIR / "groups.json")
        write_json(ous, OUTPUT_DIR / "ous.json")

        # Write CSV
        write_csv(users, OUTPUT_DIR / "users.csv")
        write_csv(groups, OUTPUT_DIR / "groups.csv")
        write_csv(ous, OUTPUT_DIR / "ous.csv")

        print("Export complete:")
        print("-", OUTPUT_DIR / "users.json")
        print("-", OUTPUT_DIR / "groups.json")
        print("-", OUTPUT_DIR / "ous.json")
        print("-", OUTPUT_DIR / "users.csv")
        print("-", OUTPUT_DIR / "groups.csv")
        print("-", OUTPUT_DIR / "ous.csv")


if __name__ == "__main__":
    main()


