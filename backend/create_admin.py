from app.auth import get_password_hash
from app.database import SessionLocal
from app.models import User

db = SessionLocal()
try:
    admin = db.query(User).filter(User.email == 'admin@example.com').first()
    if admin:
        print(f'Admin user exists: {admin.email}')
        print('Updating password to: admin123')
        admin.hashed_password = get_password_hash('admin123')
        db.commit()
        print('Password updated!')
    else:
        print('No admin user found. Creating one...')
        admin = User(
            email='admin@example.com',
            hashed_password=get_password_hash('admin123'),
            full_name='Admin User',
            is_admin=True,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print('Admin user created successfully!')
    
    print('\nLogin credentials:')
    print('Email: admin@example.com')
    print('Password: admin123')
finally:
    db.close()
