// Group Defaults Configuration for TBKK Active Directory
// This file contains default settings for group management and auto-assignment

export const GROUP_DEFAULTS_CONFIG = {
  // Display Settings
  display: {
    // Categories to expand by default (important ones)
    expandCategories: ['Internet', 'VPN', 'USB', 'WiFi', 'FileShare'],
    
    // Categories to collapse by default (less frequently used)
    collapseCategories: ['Remote', 'Aliases', 'Others'],
    
    // Hide empty categories
    hideEmpty: true,
    
    // Show statistics cards at the top
    showStats: true,
    
    // Number of items to show per category before "Show more"
    itemsPerCategory: 5,
    
    // Make statistics cards clickable for filtering
    statsClickable: true,
    
    // Default view mode
    defaultViewMode: 'all' // 'all', 'member', 'available'
  },
  
  // Auto-assign Groups (when creating new user)
  autoAssign: {
    // Base groups that every user should get
    baseGroups: [],
    
    // OU-based group mapping
    // When user selects an OU, these groups will be auto-checked
    ouMapping: {
      // IT Department - ตามที่ผู้ใช้กำหนด
      'IT-K1IT00': ['IT', 'AllowAll', 'VPNusers', 'PSO-OU-90Days', 'Domain Admins', 'Domain Users', 'AL_it-NAME AD', 'Proposal-R'],
      
      // ACC Department - ตามที่ผู้ใช้กำหนด
      'ACC-K1AC00': ['ACF', 'AL_account', 'AL_tbkkaccount', 'AllowAll', 'InternetUsers', 'PSO-OU-90Days', 'Scheduling', 'VPNusers', 'Domain Users', 'tbkk-mst-moldrepair-r', 'TBKT', 'VDI'],
      
      // APQP Department - ตามที่ผู้ใช้กำหนด
      'APQP-K1PJ00': ['AL_APQP', 'AL_dnc_phase10_incharge', 'AllowAll', 'APQP', 'CE-R', 'Domain Users', 'GDC-R', 'MA-R', 'PCL-R', 'PE-R', 'PSO-OU-90Days', 'QA-R', 'RD-R', 'TPM_Guest', 'VPNusers'],
      
      // BOD Department - ตามที่ผู้ใช้กำหนด
      'BOD-K1EX00': ['AC-AssetCard-R', 'ACF', 'AL_energy', 'AL_gm', 'AL_thmanagers', 'AllowAll', 'APQP', 'Domain Users', 'GM', 'InternetUsers', 'MA', 'Managers', 'PCL', 'PE', 'Proposal-R', 'PSO-OU-90Days', 'Scheduling', 'VPNusers'],
      
      // BP Department - ตามที่ผู้ใช้กำหนด
      'BP-K1BM00': ['ACF', 'AllowAll', 'BP', 'CR', 'Domain Users', 'PM', 'PSO-OU-90Days', 'TPM', 'VPNusers'],
      
      // CE Department - ตามที่ผู้ใช้กำหนด
      'CE-K1CE00': ['AL_ce', 'AL_pe_p10', 'AllowAll', 'CE', 'Domain Users', 'PSO-OU-90Days', 'tbkk-mst-ce', 'tbkk-mst-newmarking-r', 'tbkk-mst-sm', 'VPNusers'],
      
      // CG Department - ตามที่ผู้ใช้กำหนด
      'CG-K1IC00': ['AL_dnc_phase10_incharge', 'AL_jungruk', 'AllowAll', 'Domain Users', 'Internet Users', 'PE', 'PSO-OU-90Days', 'QMS', 'RD docs distribution- R', 'VPNusers'],
      
      // EEE Department - ตามที่ผู้ใช้กำหนด
      'EEE-K1EE00': ['AL_EEE', 'AL_hrm', 'AllowAll', 'Domain Users', 'GA', 'PSO-OU-90Days', 'tbkk-mst-ga', 'VPNusers'],
      
      // EVD Department - ตามที่ผู้ใช้กำหนด
      'EVD-K1ND00': ['AL_dnc_phase10_incharge', 'AL_thmanagers', 'AllowAll', 'APQP-R', 'CR', 'Domain Users', 'EVD', 'PCL', 'PE', 'PSO-OU-90Days', 'QA-R', 'SM', 'USBAllow', 'VPNusers'],
      
      // GDC Department - ตามที่ผู้ใช้กำหนด
      'GDC-K1GC00': ['AllowAll', 'Domain Users', 'MA', 'PSO-OU-90Days', 'QC', 'QCD Daily-RW', 'VPNusers'],
      
      // MA Department - ตามที่ผู้ใช้กำหนด
      'MA-K1MA01': ['AL_dnc_phase10_incharge', 'AllowAll', 'CE', 'Domain Users', 'PD4', 'PE-R', 'PSO-OU-90Days', 'QA', 'QC', 'QCD Daily-RW', 'VPNusers'],
      
      // MN Department - ตามที่ผู้ใช้กำหนด
      'MN-K1MN00': ['AllowAll', 'Domain Users', 'MN', 'PSO-OU-90Days', 'VPNusers'],
      
      // NewCommer Department - ตามที่ผู้ใช้กำหนด
      'NewCommer': ['Domain Users'],
      
      // PCL Department - ตามที่ผู้ใช้กำหนด
      'PCL-K1SC00': ['AL_dnc_phase10_incharge', 'AL_eTaxInvoice', 'AL_import-export', 'AL_tbkkaccount', 'AL_thmanagers', 'AllowAll', 'APQP', 'CR', 'Domain Users', 'Internet Users', 'Managers', 'PCL', 'PSO-OU-90Days', 'QCD Daily-RW', 'Scheduling', 'VPNusers'],
      
      // PD1 Department - ตามที่ผู้ใช้กำหนด
      'PD1-K1PD01': ['AL_dnc_phase10_incharge', 'AL_pe_p10', 'AllowAll', 'Domain Users', 'PE', 'PR-Online', 'PSO-OU-90Days', 'VPNusers'],
      
      // PD2 Department - ตามที่ผู้ใช้กำหนด
      'PD2-K1PD02': ['AL_dnc_phase10_incharge', 'AL_pe_p10', 'AllowAll', 'Domain Users', 'PD2', 'PE', 'PSO-OU-90Days', 'QC-R', 'VPNusers'],
      
      // PD3 Department - ตามที่ผู้ใช้กำหนด
      'PD3-K1PD03': ['AL_dnc_phase10_incharge', 'AL_msl_pd3', 'AllowAll', 'BH-MA-R', 'CR', 'Domain Users', 'MA', 'PSO-OU-90Days', 'VPNusers'],
      
      // PD4 Department - ตามที่ผู้ใช้กำหนด
      'PD4-K1PD04': ['AllowAll', 'CE', 'Domain Users', 'InternetUsers', 'PD4', 'PSO-OU-90Days', 'VPNusers'],
      
      // PD5 Department - ตามที่ผู้ใช้กำหนด
      'PD5-K1PD05': ['AL_msl_pd5', 'AllowAll', 'CR', 'Domain Users', 'MA', 'PSO-OU-90Days', 'QC-41-All-Group'],
      
      // PD7 Department - ตามที่ผู้ใช้กำหนด
      'PD7-K1PD07': ['AllowAll', 'Domain Users', 'MA', 'PSO-OU-90Days'],
      
      // PE Department - ตามที่ผู้ใช้กำหนด
      'PE-K1PE00': ['AL_dnc_phase10_incharge', 'AL_pe', 'AL_pe_p10', 'AllowAll', 'Domain Users', 'PE', 'PSO-OU-90Days', 'VPNusers'],
      
      // PU Department - ตามที่ผู้ใช้กำหนด
      'PU-K1PU00': ['AL_purchase', 'AL_purchase_office', 'AllowAll', 'Domain Users', 'InternetUsers', 'Proposal-R', 'PSO-OU-90Days', 'PU', 'tbkk-mst-moldrepair-r', 'VPNusers'],
      
      // QC Department - ตามที่ผู้ใช้กำหนด
      'QC-K1QC00': ['AllowAll', 'Domain Users', 'PSO-OU-90Days', 'QC'],
      
      // QA Department - ตามที่ผู้ใช้กำหนด
      'QA-K1QA00': ['AL_dnc_phase10_incharge', 'AL_QA', 'AllowAll', 'APQP', 'Domain Users', 'PSO-OU-90Days', 'QA', 'VPNusers'],
      
      // RD Department - ตามที่ผู้ใช้กำหนด
      'RD-K1RD00': ['AL_R&D', 'AllowAll', 'Domain Users', 'PSO-OU-90Days', 'RD'],
      
      // SHE Department - ตามที่ผู้ใช้กำหนด
      'SHE-K1SH00': ['AL_thmanagers', 'AllowAll', 'BH-SHE', 'Domain Users', 'Managers', 'PSO-OU-90Days', 'QCD Daily-RW', 'SHE', 'TPM', 'VPNusers'],
      
      // SM Department - ตามที่ผู้ใช้กำหนด
      'SM-K1SM00': ['AL_dnc_phase8_incharge', 'AL_sm', 'AllowAll', 'Domain Users', 'PSO-OU-90Days', 'SM', 'VPNusers'],
      
      // SYS Department - ตามที่ผู้ใช้กำหนด
      'SYS-K1SS00': ['AL_sys', 'AllowAll', 'Domain Users', 'PCL', 'PSO-OU-90Days', 'VPNusers'],
      
      // Tooling Department - ตามที่ผู้ใช้กำหนด
      'Tooling-K1TL00': ['AllowAll', 'Domain Users', 'PE', 'PSO-OU-90Days', 'QC', 'Tooling'],
      
      // TPS Department - ตามที่ผู้ใช้กำหนด
      'TPS-K1TS00': ['AL_tps', 'AllowAll', 'Domain Users', 'Internet Users', 'MA', 'PSO-OU-90Days', 'TPM'],
      
      
      
      // Default for other OUs
      'default': ['InternetUsers']
    },
    
    // Department-based suggestions (backup if OU mapping not found)
    departmentMapping: {
      'IT': ['IT', 'USBAllow', 'VPNusers', 'AllowAll'],
      'PE': ['PE', 'AllowAll'],
      'QC': ['QC', 'InternetUsers'],
      'QA': ['QA', 'InternetUsers'],
      'default': ['InternetUsers']
    }
  },
  
  // Quick Add Feature
  quickAdd: {
    enabled: true,
    
    // Popular groups that appear in Quick Add dropdown
    popularGroups: [
      'InternetUsers',
      'AllowAll',
      'VPNusers',
      'USBAllow',
      'Remote Desktop Users'
    ]
  },
  
  // Sort Configuration
  sort: {
    // How to sort categories
    categoriesBy: 'priority', // 'priority', 'alphabetical', 'count'
    
    // Priority order for categories (used when categoriesBy = 'priority')
    priorityOrder: [
      'Internet',
      'VPN', 
      'USB',
      'WiFi',
      'FileShare',
      'PasswordPolicy',
      'Remote',
      'Aliases',
      'Others'
    ],
    
    // How to sort groups within each category
    groupsBy: 'alphabetical' // 'alphabetical', 'members', 'recent'
  },
  
  // Statistics Cards Configuration
  stats: {
    // Category to color mapping for stats cards
    categoryColors: {
      'Internet': {
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        icon: '🌐',
        textColor: '#ffffff'
      },
      'VPN': {
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        icon: '🔐',
        textColor: '#ffffff'
      },
      'USB': {
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        icon: '💾',
        textColor: '#ffffff'
      },
      'WiFi': {
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        icon: '📶',
        textColor: '#ffffff'
      },
      'FileShare': {
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        icon: '📁',
        textColor: '#ffffff'
      },
      'PasswordPolicy': {
        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        icon: '🔒',
        textColor: '#ffffff'
      },
      'Remote': {
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        icon: '🖥️',
        textColor: '#ffffff'
      },
      'Aliases': {
        gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
        icon: '📧',
        textColor: '#ffffff'
      },
      'Others': {
        gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
        icon: '📦',
        textColor: '#ffffff'
      }
    }
  }
};

// Helper function to get default groups based on OU
export const getDefaultGroupsForOU = (ouDn, categorizedGroups) => {
  if (!ouDn || !categorizedGroups) return [];
  
  const config = GROUP_DEFAULTS_CONFIG.autoAssign;
  let defaultGroupNames = [...config.baseGroups];
  
  // Find matching OU in mapping
  for (const [ouPattern, groups] of Object.entries(config.ouMapping)) {
    if (ouDn.includes(ouPattern)) {
      defaultGroupNames = [...defaultGroupNames, ...groups];
      break;
    }
  }
  
  // If no match, use default
  if (defaultGroupNames.length === config.baseGroups.length) {
    defaultGroupNames = [...defaultGroupNames, ...config.ouMapping.default];
  }
  
  // Convert group names to DNs
  const defaultGroupDNs = [];
  
  Object.values(categorizedGroups).forEach(categoryGroups => {
    categoryGroups.forEach(group => {
      if (defaultGroupNames.includes(group.cn)) {
        defaultGroupDNs.push(group.dn);
      }
    });
  });
  
  return defaultGroupDNs;
};

// Helper function to get category statistics from user groups
export const getCategoryStatistics = (userGroups, categorizedGroups) => {
  const stats = {};
  
  Object.keys(categorizedGroups).forEach(category => {
    const categoryGroupDNs = categorizedGroups[category].map(g => g.dn);
    const userGroupDNs = userGroups.map(g => g.dn);
    
    const count = categoryGroupDNs.filter(dn => userGroupDNs.includes(dn)).length;
    
    stats[category] = {
      count,
      total: categorizedGroups[category].length,
      color: GROUP_DEFAULTS_CONFIG.stats.categoryColors[category] || GROUP_DEFAULTS_CONFIG.stats.categoryColors['Others']
    };
  });
  
  return stats;
};

export default GROUP_DEFAULTS_CONFIG;


