import json
import os
import hashlib
import secrets
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(pwd: str) -> str:
    return hashlib.sha256(pwd.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    """Авторизация: вход, выход, текущий пользователь, управление пользователями."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod')
    path = event.get('path', '').rstrip('/')
    session_id = event.get('headers', {}).get('x-session-id', '')

    conn = get_conn()
    cur = conn.cursor()

    # Ensure admin exists on first run
    cur.execute("SELECT COUNT(*) FROM users")
    (cnt,) = cur.fetchone()
    if cnt == 0:
        cur.execute(
            "INSERT INTO users (username, password_hash, full_name, role) VALUES (%s,%s,%s,%s)",
            ('admin', hash_password('admin123'), 'Администратор системы', 'admin')
        )
        conn.commit()

    # POST /login
    if method == 'POST' and path.endswith('/login'):
        body = json.loads(event.get('body') or '{}')
        username = body.get('username', '').strip()
        password = body.get('password', '')
        cur.execute(
            "SELECT id, full_name, role FROM users WHERE username=%s AND password_hash=%s",
            (username, hash_password(password))
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}
        user_id, full_name, role = row
        token = secrets.token_hex(32)
        cur.execute("UPDATE users SET session_token=%s WHERE id=%s", (token, user_id))
        cur.execute(
            "INSERT INTO action_logs (user_id, username, action, entity, details) VALUES (%s,%s,%s,%s,%s)",
            (user_id, username, 'login', 'user', 'Вход в систему')
        )
        conn.commit()
        cur.close(); conn.close()
        return {
            'statusCode': 200, 'headers': CORS,
            'body': json.dumps({'token': token, 'user': {'id': user_id, 'username': username, 'full_name': full_name, 'role': role}})
        }

    # GET /me
    if method == 'GET' and path.endswith('/me'):
        if not session_id:
            cur.close(); conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
        cur.execute("SELECT id, username, full_name, role FROM users WHERE session_token=%s", (session_id,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Сессия истекла'})}
        uid, uname, full_name, role = row
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': uid, 'username': uname, 'full_name': full_name, 'role': role})}

    # POST /logout
    if method == 'POST' and path.endswith('/logout'):
        if session_id:
            cur.execute("UPDATE users SET session_token=NULL WHERE session_token=%s", (session_id,))
            conn.commit()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    # GET /users
    if method == 'GET' and path.endswith('/users'):
        cur.execute("SELECT id, username, full_name, role, created_at FROM users ORDER BY id")
        rows = cur.fetchall()
        cur.close(); conn.close()
        users = [{'id': r[0], 'username': r[1], 'full_name': r[2], 'role': r[3], 'created_at': str(r[4])} for r in rows]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(users)}

    # POST /users
    if method == 'POST' and path.endswith('/users'):
        body = json.loads(event.get('body') or '{}')
        username = body.get('username', '').strip()
        password = body.get('password', '')
        full_name = body.get('full_name', '').strip()
        role = body.get('role', 'operator')
        if not username or not password or not full_name:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}
        cur.execute(
            "INSERT INTO users (username, password_hash, full_name, role) VALUES (%s,%s,%s,%s) RETURNING id",
            (username, hash_password(password), full_name, role)
        )
        (new_id,) = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': new_id, 'username': username, 'full_name': full_name, 'role': role})}

    cur.close(); conn.close()
    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
