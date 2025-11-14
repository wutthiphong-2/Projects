from ldap3 import Server, Connection, ALL, MODIFY_REPLACE, MODIFY_ADD, MODIFY_DELETE, SUBTREE, Tls
import ssl
from app.core.config import settings
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

class LDAPConnection:
    def __init__(self):
        self.connection = None
        self.server = None

    def _is_connection_error(self, message: Optional[str]) -> bool:
        if not message:
            return False
        lowered = message.lower()
        return (
            "winerror 10054" in lowered
            or "socket" in lowered
            or "connection" in lowered
            or "server is unwilling" in lowered  # add safety for abrupt resets
        )

    def _ensure_connection(self) -> bool:
        if self.connection and self.connection.bound:
            return True
        logger.warning("🔄 LDAP connection not bound. Attempting to reconnect...")
        self.disconnect()
        return self.connect()

    def _reset_connection(self):
        logger.warning("🔁 Resetting LDAP connection...")
        self.disconnect()
        self.connect()

    def _execute_with_retry(self, operation_name: str, operation_callable) -> Tuple[bool, Optional[str]]:
        attempts = 0
        last_error = None

        while attempts < 2:
            attempts += 1

            if not self._ensure_connection():
                last_error = "Unable to bind to LDAP server"
                break

            try:
                result = operation_callable()
                if result:
                    return True, None

                last_error = self.connection.last_error if self.connection else "Unknown error"
                logger.error(f"{operation_name} failed: {last_error}")

                if self._is_connection_error(last_error) and attempts < 2:
                    self._reset_connection()
                    continue
                break
            except Exception as e:
                last_error = str(e)
                logger.error(f"{operation_name} raised exception: {last_error}")
                if self._is_connection_error(last_error) and attempts < 2:
                    self._reset_connection()
                    continue
                break

        return False, last_error
        
    def connect(self):
        """Establish LDAP connection"""
        try:
            # Use SSL/TLS for secure connection (required for password operations)
            use_ssl = settings.LDAP_URL.startswith('ldaps://')
            
            # IMPORTANT: Log LDAP URL to verify settings
            logger.info(f"🔌 Connecting to LDAP: {settings.LDAP_URL}")
            logger.info(f"🔒 Using SSL/TLS: {use_ssl}")
            
            if not use_ssl:
                # Note: LDAPS is recommended for password operations
                logger.debug("Note: Using LDAP (not LDAPS). For production, use ldaps://...:636")
            
            # Configure TLS for LDAPS
            tls_configuration = None
            if use_ssl:
                # Allow self-signed certificates (for development/internal AD)
                tls_configuration = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)
                logger.info("🔐 TLS configured with CERT_NONE validation (allowing self-signed certs)")
            
            self.server = Server(
                settings.LDAP_URL, 
                get_info=ALL, 
                use_ssl=use_ssl,
                tls=tls_configuration
            )
            
            self.connection = Connection(
                self.server,
                user=settings.LDAP_BIND_DN,
                password=settings.LDAP_BIND_PASSWORD,
                auto_bind=True
            )
            if not self.connection.bound:
                raise Exception("Failed to bind to LDAP server")
            logger.info("✅ LDAP connection established successfully")
            return True
        except Exception as e:
            logger.error(f"LDAP connection failed: {e}")
            return False
    
    def disconnect(self):
        """Close LDAP connection"""
        if self.connection:
            try:
                self.connection.unbind()
            except Exception as e:
                err = str(e)
                if "socket sending error" in err.lower() or "winerror 10054" in err:
                    # Connection already dropped by server – safe to ignore
                    logger.warning("LDAP connection already closed by remote host (WinError 10054). Resetting locally.")
                else:
                    logger.error(f"Error closing LDAP connection: {e}")
        self.connection = None
    
    def _do_search(self, base_dn, filter_str, attributes=None):
        """Internal search method (for retry logic)"""
        if attributes is None:
            attributes = ['*']
        
        all_results = []
        page_size = 1000
        cookie = None
        
        while True:
            self.connection.search(
                search_base=base_dn,
                search_filter=filter_str,
                search_scope=SUBTREE,
                attributes=attributes,
                paged_size=page_size,
                paged_cookie=cookie
            )
            
            for entry in self.connection.entries:
                entry_dict = {}
                for attr in entry.entry_attributes:
                    values = []
                    for value in entry[attr].values:
                        if isinstance(value, bytes):
                            values.append(value.decode('utf-8'))
                        else:
                            values.append(str(value))
                    entry_dict[attr] = values
                all_results.append((str(entry.entry_dn), entry_dict))
            
            cookie = self.connection.result['controls']['1.2.840.113556.1.4.319']['value']['cookie']
            
            if not cookie:
                break
        
        return all_results
    
    def search(self, base_dn, filter_str, attributes=None):
        """Search LDAP directory with unlimited size using paged search"""
        if not self.connection or not self.connection.bound:
            logger.warning("🔄 LDAP connection not bound, reconnecting...")
            if not self.connect():
                return None
        
        try:
            if attributes is None:
                attributes = ['*']
            
            # Use paged search to bypass AD's default 1000 record limit
            # This properly handles pagination by fetching all pages
            all_results = []
            page_size = 1000
            cookie = None
            
            logger.info(f"Starting paged LDAP search (filter: {filter_str})")
            
            while True:
                # Perform paged search
                self.connection.search(
                    search_base=base_dn,
                    search_filter=filter_str,
                    search_scope=SUBTREE,
                    attributes=attributes,
                    paged_size=page_size,
                    paged_cookie=cookie
                )
                
                # Process this page's results
                for entry in self.connection.entries:
                    entry_dict = {}
                    for attr in entry.entry_attributes:
                        values = []
                        for value in entry[attr].values:
                            if isinstance(value, bytes):
                                values.append(value.decode('utf-8'))
                            else:
                                values.append(str(value))
                        entry_dict[attr] = values
                    all_results.append((str(entry.entry_dn), entry_dict))
                
                # Get the cookie for the next page (handle servers without paged controls)
                controls = self.connection.result.get('controls') if isinstance(self.connection.result, dict) else None
                paging_control = None
                cookie = None

                if isinstance(controls, dict):
                    paging_control = controls.get('1.2.840.113556.1.4.319')

                if paging_control and isinstance(paging_control, dict):
                    value_dict = paging_control.get('value')
                    if isinstance(value_dict, dict):
                        cookie = value_dict.get('cookie')
                
                # If no more pages, break
                if not cookie:
                    break
                
                logger.info(f"Fetched {len(all_results)} results so far, fetching next page...")
            
            logger.info(f"LDAP paged search completed: {len(all_results)} total results")
            
            return all_results
        except Exception as e:
            logger.error(f"LDAP search failed: {e}")
            logger.error(f"Error details: {str(e)}")
            
            # Try to reconnect once if connection error
            if "socket" in str(e).lower() or "connection" in str(e).lower():
                logger.warning("🔄 Connection error detected, attempting to reconnect...")
                self.disconnect()
                if self.connect():
                    logger.info("✅ Reconnected successfully, retrying search...")
                    # Retry the search once
                    try:
                        return self._do_search(base_dn, filter_str, attributes)
                    except:
                        pass
            
            return None
    
    def add_entry(self, dn, attributes):
        """Add new LDAP entry"""
        # Convert attributes to ldap3 format
        ldap_attrs = {}
        for key, values in attributes.items():
            if isinstance(values, list):
                ldap_attrs[key] = values
            else:
                ldap_attrs[key] = [values]

        def operation():
            return self.connection.add(dn, attributes=ldap_attrs)

        success, error_msg = self._execute_with_retry(f"Add entry {dn}", operation)
        if success:
            logger.info(f"Successfully added entry: {dn}")
            return True
        else:
            logger.error(f"Failed to add entry {dn}: {error_msg}")
            return False
    
    def modify_entry(self, dn, modifications):
        """Modify LDAP entry"""
        # Convert modifications to ldap3 format: { attr: [(operation, [values...])] }
        changes = {}
        for mod_type, attr_name, values in modifications:
            if values is None:
                values_list = []
            elif isinstance(values, (bytes, str)):
                values_list = [values]
            else:
                values_list = values

            if not isinstance(values_list, list):
                values_list = [values_list]

            changes[attr_name] = [(mod_type, values_list)]

        def operation():
            return self.connection.modify(dn, changes)

        success, error_msg = self._execute_with_retry(f"Modify entry {dn}", operation)
        if success:
            logger.info(f"Successfully modified entry: {dn}")
            return True
        else:
            logger.error(f"Failed to modify entry {dn}: {error_msg}")
            return False
    
    def delete_entry(self, dn):
        """Delete LDAP entry"""
        def operation():
            return self.connection.delete(dn)

        success, error_msg = self._execute_with_retry(f"Delete entry {dn}", operation)
        if success:
            logger.info(f"Successfully deleted entry: {dn}")
            return True
        else:
            logger.error(f"Failed to delete entry {dn}: {error_msg}")
            return False

    def rename_entry(self, dn, new_rdn, new_superior=None):
        """Rename or move LDAP entry"""
        def operation():
            return self.connection.modify_dn(dn, new_rdn, new_superior=new_superior)

        success, error_msg = self._execute_with_retry(f"Rename entry {dn}", operation)
        if success:
            logger.info(f"Successfully renamed entry: {dn} -> {new_rdn}{',' + new_superior if new_superior else ''}")
            return True
        else:
            logger.error(f"Failed to rename entry {dn}: {error_msg}")
            return False

# Global LDAP connection instance
ldap_conn = LDAPConnection()

def init_ldap_connection():
    """Initialize LDAP connection"""
    return ldap_conn.connect()

def get_ldap_connection():
    """Get LDAP connection instance"""
    return ldap_conn
