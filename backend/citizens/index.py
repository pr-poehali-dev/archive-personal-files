import json
import os
import datetime
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_user(cur, session_id):
    if not session_id:
        return None
    cur.execute("SELECT id, username, role FROM users WHERE session_token=%s", (session_id,))
    return cur.fetchone()

def log_action(cur, user_id, username, action, entity_id=None, details=None):
    cur.execute(
        "INSERT INTO action_logs (user_id, username, action, entity, entity_id, details) VALUES (%s,%s,%s,%s,%s,%s)",
        (user_id, username, action, 'citizen', entity_id, details)
    )

def row_to_dict(r):
    return {
        'id': r[0], 'last_name': r[1], 'first_name': r[2], 'middle_name': r[3] or '',
        'birth_date': str(r[4]) if r[4] else '', 'birth_place': r[5] or '',
        'address': r[6] or '', 'email': r[7] or '', 'phone': r[8] or '',
        'inn': r[9] or '', 'snils': r[10] or '', 'photo': r[11] or '',
        'case_number': r[12], 'notes': r[13] or '', 'archived': r[14],
        'created_at': str(r[15]),
    }

def handler(event: dict, context) -> dict:
    """CRUD для личных дел граждан."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod')
    path = event.get('path', '').rstrip('/')
    session_id = event.get('headers', {}).get('x-session-id', '')
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    cur = conn.cursor()

    user = get_user(cur, session_id)
    if not user:
        cur.close(); conn.close()
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

    user_id, username, role = user

    # GET / — list
    if method == 'GET':
        search = params.get('search', '')
        show_archived = params.get('archived', 'false') == 'true'
        q = "SELECT id,last_name,first_name,middle_name,birth_date,birth_place,address,email,phone,inn,snils,photo,case_number,notes,archived,created_at FROM citizens WHERE archived=%s"
        args = [show_archived]
        if search:
            q += " AND (last_name ILIKE %s OR first_name ILIKE %s OR middle_name ILIKE %s)"
            like = f'%{search}%'
            args += [like, like, like]
        q += " ORDER BY created_at DESC"
        cur.execute(q, args)
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps([row_to_dict(r) for r in rows])}

    # POST /
    if method == 'POST':
        parts = path.split('/')
        body = json.loads(event.get('body') or '{}')

        # POST /<id>/archive — toggle archive
        if len(parts) >= 2 and parts[-1] == 'archive':
            cid = int(parts[-2])
            cur.execute("SELECT archived FROM citizens WHERE id=%s", (cid,))
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Не найдено'})}
            new_state = not row[0]
            cur.execute("UPDATE citizens SET archived=%s WHERE id=%s", (new_state, cid))
            log_action(cur, user_id, username, 'archive' if new_state else 'unarchive', cid)
            conn.commit()
            cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'archived': new_state})}

        # Create new citizen
        last_name = body.get('last_name', '').strip()
        first_name = body.get('first_name', '').strip()
        if not last_name or not first_name:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'ФИО обязательно'})}

        cur.execute("SELECT COUNT(*) FROM citizens")
        (cnt,) = cur.fetchone()
        year = datetime.date.today().year % 100
        case_number = f"ЛД-{str(cnt + 1).zfill(4)}/{year:02d}"

        cur.execute(
            "INSERT INTO citizens (last_name,first_name,middle_name,birth_date,birth_place,address,email,phone,inn,snils,photo,case_number,notes,created_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id,last_name,first_name,middle_name,birth_date,birth_place,address,email,phone,inn,snils,photo,case_number,notes,archived,created_at",
            (
                last_name, first_name,
                body.get('middle_name') or None, body.get('birth_date') or None,
                body.get('birth_place') or None, body.get('address') or None,
                body.get('email') or None, body.get('phone') or None,
                body.get('inn') or None, body.get('snils') or None,
                body.get('photo') or None, case_number,
                body.get('notes') or None, user_id,
            )
        )
        row = cur.fetchone()
        log_action(cur, user_id, username, 'create', row[0], f'Создано дело {case_number}')
        conn.commit()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(row_to_dict(row))}

    # PUT /<id> — update
    if method == 'PUT':
        parts = path.split('/')
        cid = int(parts[-1])
        body = json.loads(event.get('body') or '{}')
        cur.execute(
            "UPDATE citizens SET last_name=%s,first_name=%s,middle_name=%s,birth_date=%s,birth_place=%s,address=%s,email=%s,phone=%s,inn=%s,snils=%s,photo=%s,notes=%s WHERE id=%s RETURNING id,last_name,first_name,middle_name,birth_date,birth_place,address,email,phone,inn,snils,photo,case_number,notes,archived,created_at",
            (
                body.get('last_name', ''), body.get('first_name', ''),
                body.get('middle_name') or None, body.get('birth_date') or None,
                body.get('birth_place') or None, body.get('address') or None,
                body.get('email') or None, body.get('phone') or None,
                body.get('inn') or None, body.get('snils') or None,
                body.get('photo') or None, body.get('notes') or None,
                cid
            )
        )
        row = cur.fetchone()
        log_action(cur, user_id, username, 'update', cid, f'Обновлено дело {row[12]}')
        conn.commit()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(row_to_dict(row))}

    cur.close(); conn.close()
    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
