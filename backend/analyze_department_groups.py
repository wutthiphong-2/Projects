"""
Analyze common groups per department
"""
from app.core.database import get_ldap_connection
from collections import defaultdict, Counter
import json

def analyze_department_groups():
    """Find most common groups per department"""
    ldap_conn = get_ldap_connection()
    
    if not ldap_conn.connect():
        print("LDAP connection failed!")
        return
    
    print("Fetching all users with department and groups...")
    
    # Get all users with department and group memberships
    results = ldap_conn.search(
        ldap_conn.connection.server.info.other['defaultNamingContext'][0],
        "(&(objectClass=user)(objectCategory=person))",
        ["sAMAccountName", "memberOf", "cn", "department"]
    )
    
    if not results:
        print("No users found!")
        return
    
    print(f"Found {len(results)} users")
    
    # Organize by department
    dept_groups = defaultdict(lambda: Counter())
    dept_user_count = Counter()
    
    for dn, attrs in results:
        dept_list = attrs.get("department", [])
        if not dept_list or len(dept_list) == 0:
            continue
        department = dept_list[0]
        if not department:
            continue
            
        member_of = attrs.get("memberOf", [])
        if not member_of:
            continue
        
        dept_user_count[department] += 1
        
        # Extract group CNs
        for group_dn in member_of:
            if group_dn.startswith("CN="):
                cn = group_dn.split(",")[0].replace("CN=", "")
                dept_groups[department][cn] += 1
    
    print(f"\nFound {len(dept_groups)} departments")
    print("=" * 100)
    
    # Sort departments by user count
    sorted_depts = sorted(dept_user_count.items(), key=lambda x: x[1], reverse=True)
    
    result = {}
    
    for dept, user_count in sorted_depts[:20]:  # Top 20 departments
        print(f"\n{'='*100}")
        print(f"Department: {dept}")
        print(f"Total Users: {user_count}")
        print(f"{'='*100}")
        
        # Get top groups for this department
        top_groups = dept_groups[dept].most_common(15)
        
        print(f"\n{'Rank':<6} {'Group Name':<50} {'Users':<10} {'%':<8}")
        print("-" * 100)
        
        dept_result = {
            'total_users': user_count,
            'top_groups': []
        }
        
        for rank, (group_name, count) in enumerate(top_groups, 1):
            percentage = (count / user_count) * 100
            print(f"{rank:<6} {group_name:<50} {count:<10} {percentage:>6.1f}%")
            
            dept_result['top_groups'].append({
                'name': group_name,
                'count': count,
                'percentage': round(percentage, 1)
            })
        
        # Recommend default groups (>50% usage)
        recommended = [g for g, c in top_groups if (c / user_count) >= 0.5]
        
        if recommended:
            print(f"\nRECOMMENDED DEFAULT GROUPS (>50% usage):")
            for group in recommended:
                count = dept_groups[dept][group]
                pct = (count / user_count) * 100
                print(f"  - {group} ({count}/{user_count} users, {pct:.1f}%)")
            
            dept_result['recommended_defaults'] = recommended
        
        result[dept] = dept_result
    
    # Generate config
    print("\n" + "=" * 100)
    print("RECOMMENDED DEPARTMENT DEFAULT GROUPS CONFIG")
    print("=" * 100)
    print("\nexport const DEPARTMENT_DEFAULT_GROUPS = {")
    
    for dept, data in result.items():
        if 'recommended_defaults' in data and data['recommended_defaults']:
            print(f"  '{dept}': [")
            for group in data['recommended_defaults']:
                count = data['top_groups'][0]['count'] if data['top_groups'] else 0
                for g in data['top_groups']:
                    if g['name'] == group:
                        count = g['count']
                        pct = g['percentage']
                        break
                print(f"    '{group}',  // {count} users ({pct:.1f}%)")
            print("  ],")
    
    print("};")
    
    # Save to JSON
    with open('department_groups_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n\nResults saved to department_groups_analysis.json")

if __name__ == "__main__":
    print("Department Groups Analysis")
    print("=" * 100)
    analyze_department_groups()

