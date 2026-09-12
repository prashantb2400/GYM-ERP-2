import * as XLSX from 'xlsx';

/**
 * Generates and triggers browser download of the standard Excel template for bulk member import.
 */
export function downloadMemberImportTemplate(existingPlanNames: string[] = []): void {
  const sampleHeaders = [
    'Full Name *',
    'Phone Number *',
    'WhatsApp Number',
    'Email',
    'Gender (male/female/other)',
    'Date of Birth (YYYY-MM-DD)',
    'Blood Group',
    'Plan Name',
    'Plan Start Date (YYYY-MM-DD)',
    'Plan End Date (YYYY-MM-DD)',
    'Admission Date (YYYY-MM-DD)',
    'Status (active/expired/pending)',
    'Outstanding Due',
    'Total Paid Lifetime',
    'Locker Number',
    'Address',
    'City',
    'State',
    'Pin Code',
    'Emergency Contact Name',
    'Emergency Contact Phone',
  ];

  const sampleRows = [
    [
      'Rahul Sharma',
      '9876543210',
      '9876543210',
      'rahul.sharma@example.com',
      'male',
      '1996-05-14',
      'O+',
      existingPlanNames[0] || 'Annual Fitness Plan',
      new Date().toISOString().split('T')[0],
      '',
      new Date().toISOString().split('T')[0],
      'active',
      0,
      12000,
      'L-14',
      'Flat 402, Green Valley Apartments',
      'Mumbai',
      'Maharashtra',
      '400001',
      'Pooja Sharma',
      '9876543211',
    ],
    [
      'Priya Patel',
      '9823456789',
      '9823456789',
      'priya.patel@example.com',
      'female',
      '1999-11-20',
      'B+',
      existingPlanNames[1] || 'Quarterly Strength',
      new Date().toISOString().split('T')[0],
      '',
      new Date().toISOString().split('T')[0],
      'active',
      1000,
      3500,
      '',
      '12 MG Road',
      'Pune',
      'Maharashtra',
      '411001',
      'Kishore Patel',
      '9823456780',
    ],
    [
      'Amit Verma',
      '9712345678',
      '9712345678',
      '',
      'male',
      '1992-03-08',
      'A+',
      existingPlanNames[0] || 'Monthly General',
      new Date().toISOString().split('T')[0],
      '',
      new Date().toISOString().split('T')[0],
      'active',
      0,
      1500,
      '',
      'Sector 18, Block B',
      'Noida',
      'Uttar Pradesh',
      '201301',
      '',
      '',
    ],
  ];

  // Sheet 1: Members Template
  const wsData = [sampleHeaders, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set nice column widths
  ws['!cols'] = [
    { wch: 22 }, // Full Name
    { wch: 16 }, // Phone
    { wch: 16 }, // WhatsApp
    { wch: 26 }, // Email
    { wch: 18 }, // Gender
    { wch: 22 }, // DOB
    { wch: 14 }, // Blood Group
    { wch: 22 }, // Plan Name
    { wch: 22 }, // Plan Start
    { wch: 22 }, // Plan End
    { wch: 22 }, // Admission Date
    { wch: 18 }, // Status
    { wch: 16 }, // Outstanding Due
    { wch: 18 }, // Total Paid
    { wch: 15 }, // Locker Number
    { wch: 30 }, // Address
    { wch: 16 }, // City
    { wch: 16 }, // State
    { wch: 12 }, // Pin Code
    { wch: 24 }, // Emergency Name
    { wch: 22 }, // Emergency Phone
  ];

  // Sheet 2: Field Guide & Instructions
  const instructions = [
    ['GymERP — Bulk Member Import Guide & Field Specifications'],
    [''],
    ['Field Name', 'Required?', 'Format / Accepted Values', 'Notes'],
    ['Full Name', 'YES', 'Text (e.g. Rahul Sharma)', 'Mandatory. Cannot be empty.'],
    ['Phone Number', 'YES', '10-digit mobile number (e.g. 9876543210)', 'Used as unique member identifier.'],
    ['WhatsApp Number', 'No', '10-digit mobile number', 'Defaults to Phone Number if left blank.'],
    ['Email', 'No', 'Standard email (e.g. user@example.com)', 'Must be valid format if provided.'],
    ['Gender', 'No', 'male, female, or other', 'Defaults to empty if not specified.'],
    ['Date of Birth', 'No', 'YYYY-MM-DD or DD-MM-YYYY', 'Member birthdate for birthday reminders.'],
    ['Blood Group', 'No', 'A+, B+, O+, AB+, A-, B-, O-, AB-', 'Medical reference.'],
    ['Plan Name', 'No', existingPlanNames.length > 0 ? `Available: ${existingPlanNames.join(', ')}` : 'Matches existing plan name in gym', 'Automatically calculates end date if end date is blank.'],
    ['Plan Start Date', 'No', 'YYYY-MM-DD', 'Defaults to today if left blank.'],
    ['Plan End Date', 'No', 'YYYY-MM-DD', 'If omitted, computed automatically from Plan duration.'],
    ['Admission Date', 'No', 'YYYY-MM-DD', 'Join date. Defaults to Plan Start Date or today.'],
    ['Status', 'No', 'active, expired, pending, frozen', 'Defaults to "active".'],
    ['Outstanding Due', 'No', 'Number (e.g. 0 or 500)', 'Pending balance amount.'],
    ['Total Paid Lifetime', 'No', 'Number (e.g. 4500)', 'Historical fees paid by member.'],
    ['Locker Number', 'No', 'Text (e.g. L-14)', 'Optional locker allocation.'],
    ['Address / City / State / Pin', 'No', 'Text', 'Residential address fields.'],
    ['Emergency Contact Name / Phone', 'No', 'Text / 10-digit phone', 'Emergency reference contact.'],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 45 }, { wch: 50 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'Members');
  XLSX.utils.book_append_sheet(workbook, wsInstructions, 'Instructions');

  // Convert to array buffer and download via Blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'GymERP_Members_Import_Template.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
