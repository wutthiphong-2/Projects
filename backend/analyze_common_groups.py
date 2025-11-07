"""
Analyze most common groups assigned to users
"""
from app.core.database import get_ldap_connection
from collections import Counter
import json

def analyze_common_groups():
    """Find most commonly assigned groups from actual users"""
    ldap_conn = get_ldap_connection()
    
    if not ldap_conn.connect():
        print("LDAP connection failed!")
        return
    
    print("Fetching all users and their groups...")
    
    # Get all users with their group memberships
    results = ldap_conn.search(
        ldap_conn.connection.server.info.other['defaultNamingContext'][0],
        "(&(objectClass=user)(objectCategory=person))",
        ["sAMAccountName", "memberOf", "cn"]
    )
    
    if not results:
        print("No users found!")
        return
    
    print(f"Found {len(results)} users")
    
    # Count group occurrences
    group_counter = Counter()
    total_users = 0
    
    for dn, attrs in results:
        member_of = attrs.get("memberOf", [])
        if not member_of:
            continue
            
        total_users += 1
        
        # Extract group CNs from DNs
        for group_dn in member_of:
            # Extract CN from DN
            if group_dn.startswith("CN="):
                cn = group_dn.split(",")[0].replace("CN=", "")
                group_counter[cn] += 1
    
    print(f"\nAnalyzing {total_users} users with group memberships...")
    print("=" * 80)
    
    # Get top 30 most common groups
    top_groups = group_counter.most_common(30)
    
    print(f"\n{'Rank':<6} {'Group Name':<50} {'Users':<10} {'%':<8}")
    print("-" * 80)
    
    for rank, (group_name, count) in enumerate(top_groups, 1):
        percentage = (count / total_users) * 100
        print(f"{rank:<6} {group_name:<50} {count:<10} {percentage:>6.1f}%")
    
    # Categorize groups
    print("\n" + "=" * 80)
    print("CATEGORIZATION ANALYSIS")
    print("=" * 80)
    
    categories = {
        'Internet': [],
        'VPN': [],
        'USB': [],
        'FileShare': [],
        'PasswordPolicy': [],
        'Remote': [],
        'Aliases': [],
        'Others': []
    }
    
    for group_name, count in top_groups:
        group_lower = group_name.lower()
        percentage = (count / total_users) * 100
        
        if 'internet' in group_lower or 'web' in group_lower:
            categories['Internet'].append((group_name, count, percentage))
        elif 'vpn' in group_lower:
            categories['VPN'].append((group_name, count, percentage))
        elif 'usb' in group_lower:
            categories['USB'].append((group_name, count, percentage))
        elif 'share' in group_lower or 'file' in group_lower or 'folder' in group_lower:
            categories['FileShare'].append((group_name, count, percentage))
        elif 'password' in group_lower or 'pwd' in group_lower:
            categories['PasswordPolicy'].append((group_name, count, percentage))
        elif 'remote' in group_lower or 'rdp' in group_lower or 'desktop' in group_lower:
            categories['Remote'].append((group_name, count, percentage))
        elif 'alias' in group_lower or 'mail' in group_lower or 'email' in group_lower:
            categories['Aliases'].append((group_name, count, percentage))
        else:
            categories['Others'].append((group_name, count, percentage))
    
    for category, groups in categories.items():
        if groups:
            print(f"\n{category}:")
            for group_name, count, percentage in groups:
                print(f"  - {group_name:<45} ({count} users, {percentage:.1f}%)")
    
    # Generate recommended "Others" filter
    print("\n" + "=" * 80)
    print("RECOMMENDED 'OTHERS' CATEGORY FILTER (groups used by >5% of users)")
    print("=" * 80)
    
    others_common = [
        (name, count, (count/total_users)*100) 
        for name, count in group_counter.most_common() 
        if (count/total_users)*100 >= 5.0
    ]
    
    # Filter to get only "Others" category groups
    others_filtered = []
    for group_name, count, percentage in others_common:
        group_lower = group_name.lower()
        is_other = not any([
            'internet' in group_lower,
            'vpn' in group_lower,
            'usb' in group_lower,
            'share' in group_lower,
            'file' in group_lower,
            'folder' in group_lower,
            'password' in group_lower,
            'remote' in group_lower,
            'rdp' in group_lower,
            'alias' in group_lower,
            'mail' in group_lower,
            'email' in group_lower
        ])
        if is_other:
            others_filtered.append((group_name, count, percentage))
    
    print("\nconst commonSystemGroups = [")
    for group_name, count, percentage in sorted(others_filtered, key=lambda x: x[1], reverse=True):
        print(f"  '{group_name}',  // {count} users ({percentage:.1f}%)")
    print("];")
    
    # Save to JSON
    result = {
        'total_users_analyzed': total_users,
        'top_30_groups': [
            {'name': name, 'count': count, 'percentage': round((count/total_users)*100, 1)}
            for name, count in top_groups
        ],
        'categories': {
            cat: [
                {'name': name, 'count': count, 'percentage': round(pct, 1)}
                for name, count, pct in groups
            ]
            for cat, groups in categories.items() if groups
        },
        'recommended_others_filter': [
            {'name': name, 'count': count, 'percentage': round(pct, 1)}
            for name, count, pct in others_filtered
        ]
    }
    
    with open('group_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n\nResults saved to group_analysis.json")

if __name__ == "__main__":
    print("Group Usage Analysis")
    print("=" * 80)
    analyze_common_groups()

