from dotenv import load_dotenv
import os
from ldap3 import Server, Connection, ALL, SUBTREE

load_dotenv()

LDAP_URL = os.getenv('LDAP_URL')
LDAP_BASE_DN = os.getenv('LDAP_BASE_DN')
LDAP_BIND_DN = os.getenv('LDAP_BIND_DN')
LDAP_BIND_PASSWORD = os.getenv('LDAP_BIND_PASSWORD')

print('Using:', LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN)

server = Server(LDAP_URL, get_info=ALL)
conn = Connection(server, user=LDAP_BIND_DN, password=LDAP_BIND_PASSWORD, auto_bind=True)

if not conn.bind():
    print('Bind failed:', conn.result)
    raise SystemExit(1)

print('Bind successful, searching for department attribute...')
try:
    conn.search(LDAP_BASE_DN, '(objectClass=user)', search_scope=SUBTREE, attributes=['department', 'sAMAccountName', 'cn'])
except Exception as e:
    print('Search error:', e)
    conn.unbind()
    raise

deps = set()
count_with_dept = 0
for entry in conn.entries:
    # entry[attr].value may be str or list
    try:
        values = entry['department'].values
    except Exception:
        values = []
    if values:
        # normalize
        for v in values:
            if v and str(v).strip():
                deps.add(str(v).strip())
                count_with_dept += 1

print('Total entries scanned:', len(conn.entries))
print('Entries with department attribute (non-empty):', count_with_dept)
if deps:
    print('Departments found:')
    for d in sorted(deps):
        print('-', d)
else:
    print('No non-empty department attribute found in scanned entries.')

conn.unbind()
