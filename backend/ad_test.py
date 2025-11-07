from dotenv import load_dotenv
import os
from ldap3 import Server, Connection, ALL, NTLM, SUBTREE, ALL_ATTRIBUTES

load_dotenv()

LDAP_URL = os.getenv('LDAP_URL')
LDAP_BASE_DN = os.getenv('LDAP_BASE_DN')
LDAP_BIND_DN = os.getenv('LDAP_BIND_DN')
LDAP_BIND_PASSWORD = os.getenv('LDAP_BIND_PASSWORD')
LDAP_SEARCH_FILTER = os.getenv('LDAP_SEARCH_FILTER', '(objectClass=user)')

print('Using:', LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN)

if not (LDAP_URL and LDAP_BASE_DN):
    print('Missing LDAP URL or BASE DN in .env')
    raise SystemExit(1)

server = Server(LDAP_URL, get_info=ALL)

def try_bind(user=None, password=None):
    if user and password:
        print(f'Trying credential bind as {user}')
        conn = Connection(server, user=user, password=password, auto_bind=False)
    else:
        print('Trying anonymous bind')
        conn = Connection(server, auto_bind=False)
    try:
        ok = conn.bind()
    except Exception as e:
        print('Bind raised exception:', e)
        return None
    print('Bind result:', conn.result)
    return conn if ok else None

conn = None
if LDAP_BIND_DN and LDAP_BIND_PASSWORD:
    conn = try_bind(LDAP_BIND_DN, LDAP_BIND_PASSWORD)
    if not conn:
        print('Credential bind failed, will try anonymous bind as fallback')

if not conn:
    conn = try_bind()

if not conn:
    print('All bind attempts failed')
    raise SystemExit(1)

print('Bind successful, searching...')
try:
    conn.search(LDAP_BASE_DN, LDAP_SEARCH_FILTER, search_scope=SUBTREE, attributes=['sAMAccountName','givenName','sn','mail'])
except Exception as e:
    print('Search raised exception:', e)
    conn.unbind()
    raise

if not conn.entries:
    print('No entries found for filter:', LDAP_SEARCH_FILTER)
else:
    print('Found', len(conn.entries), 'entries. Sample:')
    for entry in conn.entries[:3]:
        print(entry)

conn.unbind()
