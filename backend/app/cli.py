"""CLI tools for WintStatus administration.

Usage:
    docker exec wintstatus-backend python -m app.cli reset-auth
    docker exec wintstatus-backend python -m app.cli reset-auth --disable
"""
import argparse
import secrets
import sys


def cmd_reset_auth(disable: bool, password: str | None) -> None:
    import bcrypt
    from app.database import SessionLocal
    from app.services.app_config_service import set_auth_enabled, set_auth_password_hash

    db = SessionLocal()
    try:
        if disable:
            set_auth_enabled(db, False)
            set_auth_password_hash(db, "")
            print("Auth disabled.")
        else:
            new_password = password or secrets.token_urlsafe(12)
            hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
            set_auth_password_hash(db, hashed)
            set_auth_enabled(db, True)
            print("Auth password set.")
            print("  Username: (anything — the username is not checked)")
            print(f"  Password: {new_password}")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="WintStatus admin CLI")
    sub = parser.add_subparsers(dest="command")

    auth_parser = sub.add_parser("reset-auth", help="Reset or disable the auth password")
    auth_parser.add_argument("--disable", action="store_true", help="Disable auth entirely")
    auth_parser.add_argument("--password", help="Set a specific password (omit for a random one)")

    args = parser.parse_args()

    if args.command == "reset-auth":
        cmd_reset_auth(args.disable, getattr(args, "password", None))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
