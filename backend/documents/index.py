import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_user(cur, session_id):
    if not session_id:
        return None
    cur.execute("SELECT id, username, role FROM users WHERE session_token=%s", (session_id,))
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    """Управление документами: загрузка, список, удаление."""
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

    # GET / — all docs
    if method == 'GET' and not params.get('citizen_id'):
        cur.execute(
            "SELECT d.id, d.citizen_id, c.last_name||' '||c.first_name||' '||COALESCE(c.middle_name,'') as fio, c.case_number, d.name, d.size, d.uploaded_at, u.full_name FROM documents d JOIN citizens c ON c.id=d.citizen_id LEFT JOIN users u ON u.id=d.uploaded_by WHERE d.removed=FALSE ORDER BY d.uploaded_at DESC"
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        docs = [{'id': r[0], 'citizen_id': r[1], 'fio': r[2].strip(), 'case_number': r[3], 'name': r[4], 'size': r[5], 'uploaded_at': str(r[6]), 'uploaded_by': r[7] or ''} for r in rows]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(docs)}

    # GET /?citizen_id=X — docs for one citizen
    if method == 'GET' and params.get('citizen_id'):
        cid = int(params['citizen_id'])
        cur.execute(
            "SELECT id, name, size, data, uploaded_at FROM documents WHERE citizen_id=%s AND removed=FALSE ORDER BY uploaded_at DESC",
            (cid,)
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        docs = [{'id': r[0], 'name': r[1], 'size': r[2], 'data': r[3], 'uploaded_at': str(r[4])} for r in rows]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(docs)}

    if method == 'POST':
        parts = path.split('/')

        # POST /<doc_id>/remove
        if len(parts) >= 2 and parts[-1] == 'remove':
            doc_id = int(parts[-2])
            cur.execute("SELECT citizen_id FROM documents WHERE id=%s", (doc_id,))
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Документ не найден'})}
            cur.execute("UPDATE documents SET removed=TRUE WHERE id=%s", (doc_id,))
            cur.execute(
                "INSERT INTO action_logs (user_id, username, action, entity, entity_id, details) VALUES (%s,%s,%s,%s,%s,%s)",
                (user_id, username, 'remove_document', 'document', doc_id, 'Удалён документ')
            )
            conn.commit()
            cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # POST / — upload
        body = json.loads(event.get('body') or '{}')
        citizen_id = body.get('citizen_id')
        name = body.get('name', '')
        size = body.get('size', 0)
        data = body.get('data', '')
        if not citizen_id or not name or not data:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Не переданы данные файла'})}
        cur.execute(
            "INSERT INTO documents (citizen_id, name, size, data, uploaded_by) VALUES (%s,%s,%s,%s,%s) RETURNING id, uploaded_at",
            (citizen_id, name, size, data, user_id)
        )
        doc_id, uploaded_at = cur.fetchone()
        cur.execute(
            "INSERT INTO action_logs (user_id, username, action, entity, entity_id, details) VALUES (%s,%s,%s,%s,%s,%s)",
            (user_id, username, 'upload_document', 'citizen', citizen_id, f'Загружен документ: {name}')
        )
        conn.commit()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': doc_id, 'name': name, 'size': size, 'data': data, 'uploaded_at': str(uploaded_at)})}

    cur.close(); conn.close()
    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
