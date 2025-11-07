from ldap3 import Server, Connection, ALL, MODIFY_REPLACE, MODIFY_ADD, MODIFY_DELETE, SUBTREE, Tls
import ssl
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class LDAPConnection:
    def __init__(self):
        self.connection = None
        self.server = None
        
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
                logger.info("LDAP connection closed")
            except Exception as e:
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
                
                # Get the cookie for the next page
                cookie = self.connection.result['controls']['1.2.840.113556.1.4.319']['value']['cookie']
                
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
        if not self.connection:
            if not self.connect():
                return False
        
        try:
            # Convert attributes to ldap3 format
            ldap_attrs = {}
            for key, values in attributes.items():
                if isinstance(values, list):
                    ldap_attrs[key] = values
                else:
                    ldap_attrs[key] = [values]
            
            result = self.connection.add(dn, attributes=ldap_attrs)
            if result:
                logger.info(f"Successfully added entry: {dn}")
                return True
            else:
                logger.error(f"Failed to add entry {dn}: {self.connection.last_error}")
                return False
        except Exception as e:
            logger.error(f"Failed to add entry {dn}: {e}")
            return False
    
    def modify_entry(self, dn, modifications):
        """Modify LDAP entry"""
        if not self.connection:
            if not self.connect():
                return False
        
        try:
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

            result = self.connection.modify(dn, changes)
            if result:
                logger.info(f"Successfully modified entry: {dn}")
                return True
            else:
                logger.error(f"Failed to modify entry {dn}: {self.connection.last_error}")
                return False
        except Exception as e:
            logger.error(f"Failed to modify entry {dn}: {e}")
            return False
    
    def delete_entry(self, dn):
        """Delete LDAP entry"""
        if not self.connection:
            if not self.connect():
                return False
        
        try:
            result = self.connection.delete(dn)
            if result:
                logger.info(f"Successfully deleted entry: {dn}")
                return True
            else:
                logger.error(f"Failed to delete entry {dn}: {self.connection.last_error}")
                return False
        except Exception as e:
            logger.error(f"Failed to delete entry {dn}: {e}")
            return False

# Global LDAP connection instance
ldap_conn = LDAPConnection()

def init_ldap_connection():
    """Initialize LDAP connection"""
    return ldap_conn.connect()

def get_ldap_connection():
    """Get LDAP connection instance"""
    return ldap_conn
