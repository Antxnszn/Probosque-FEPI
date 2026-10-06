import uuid
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, Technician
from app.schemas.auth import Token, TokenData, UserCreate, UserResponse
from app.utils.crypto import verify_password, get_password_hash, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    q = select(User).where(User.username == username)
    res = await db.execute(q)
    user = res.scalar_one_or_none()
    if user is None or not user.active:
        raise credentials_exception
    return user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    q = select(User).where(User.username == form_data.username)
    res = await db.execute(q)
    user = res.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": str(user.id)}
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        role=user.role,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    q = select(User).where(User.username == user_in.username)
    res = await db.execute(q)
    existing = res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    user = User(
        id=uuid.uuid4(),
        username=user_in.username,
        display_name=user_in.display_name,
        role=user_in.role,
        active=True,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)

    if user_in.role == "TECHNICIAN":
        tech = Technician(
            id=user.id,
            employee_code=user_in.employee_code or f"TECH-{uuid.uuid4().hex[:6].upper()}",
            active=True,
        )
        db.add(tech)

    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user
