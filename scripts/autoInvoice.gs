/**
 * Automated Invoice Generator — Google Apps Script
 * 
 * Scheduled: Every 1st of the month, generates invoices for active projects
 * Saves to Supabase `invoices` table via REST API
 * 
 * SETUP:
 * 1. Go to https://script.google.com/
 * 2. Create New Project → paste this code
 * 3. Replace SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_EMAIL below
 * 4. Run → setupTrigger() once to create monthly schedule
 * 5. Review → Executions tab to see results
 * 
 * SECURITY:
 * Use SUPABASE_SERVICE_KEY (anon key works too but service_role bypasses RLS)
 * Find it: Supabase Dashboard → Settings → API → service_role key
 */

const CONFIG = {
  SUPABASE_URL: 'https://dkkriesneublbmrihgvp.supabase.co',
  // ⚠️ Replace with your actual Supabase anon key (or service_role key)
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra3JpZXNuZXVibGJtcmloZ3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzk2NjIsImV4cCI6MjA5ODMxNTY2Mn0.xBzuqJ4kCLWMxvT6CRNIpSMDVcBQvq42Xeg0OnHfPCY',
  ADMIN_EMAIL: 'admin@mpalomares.com', // for notifications
  INVOICE_DUE_DAYS: 15, // days from generation
  INVOICE_DESCRIPTION: 'Monthly Management Fee'
};

/**
 * Main function — run on schedule or manually
 * Fetches active projects, generates invoice for each
 */
function generateMonthlyInvoices() {
  const today = new Date();
  const month = today.toLocaleString('en-US', { month: 'long' });
  const year = today.getFullYear();
  
  console.log(`🔄 Auto-Invoice Generation: ${month} ${year}`);
  
  // 1. Fetch active projects from Supabase
  const projects = fetchActiveProjects();
  if (!projects || projects.length === 0) {
    console.log('No active projects found.');
    return;
  }
  
  console.log(`Found ${projects.length} active project(s)`);
  
  // 2. Get last invoice number
  const lastNum = getLastInvoiceNumber();
  let nextNum = lastNum + 1;
  
  const created = [];
  
  // 3. Generate invoice for each active project
  projects.forEach(project => {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + CONFIG.INVOICE_DUE_DAYS);
    
    const invoiceNum = '#IV-' + String(nextNum).padStart(5, '0');
    const amount = Number(project.budget) || 0;
    
    if (amount <= 0) {
      console.log(`Skipping ${project.name}: budget is 0`);
      return;
    }
    
    const invoiceData = {
      project_id: project.id,
      invoice_num: invoiceNum,
      title: `${month} ${year} — ${CONFIG.INVOICE_DESCRIPTION}`,
      amount: amount,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'sent'
    };
    
    const result = insertInvoice(invoiceData);
    if (result) {
      created.push({ name: project.name, num: invoiceNum, amount: amount });
      // Also log activity
      logActivity(project.id, 'invoice', 
        `Invoice ${invoiceNum} sent — ₱${amount.toLocaleString()}`);
    }
    
    nextNum++;
  });
  
  // 4. Send summary email
  if (created.length > 0) {
    sendSummaryEmail(month, year, created);
  }
  
  console.log(`✅ Generated ${created.length} invoice(s)`);
}

/**
 * Fetch active/ongoing projects from Supabase
 */
function fetchActiveProjects() {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/projects?select=*&status=in.(active,review)`;
  const options = {
    method: 'GET',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    },
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    if (response.getResponseCode() >= 400) {
      console.error('Error fetching projects:', data);
      return null;
    }
    return data;
  } catch (e) {
    console.error('Fetch failed:', e.toString());
    return null;
  }
}

/**
 * Get the last invoice number from Supabase
 */
function getLastInvoiceNumber() {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/invoices?select=invoice_num&order=id.desc&limit=1`;
  const options = {
    method: 'GET',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    if (data && data.length > 0) {
      const num = parseInt(data[0].invoice_num.replace('#IV-', ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  } catch (e) {
    console.error('Failed to get last invoice number:', e.toString());
    return 0;
  }
}

/**
 * Insert a new invoice into Supabase
 */
function insertInvoice(invoiceData) {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/invoices`;
  const options = {
    method: 'POST',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    payload: JSON.stringify(invoiceData),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() >= 400) {
      console.error('Insert invoice failed:', response.getContentText());
      return false;
    }
    console.log(`✅ Invoice ${invoiceData.invoice_num} created for project ${invoiceData.project_id}`);
    return true;
  } catch (e) {
    console.error('Insert failed:', e.toString());
    return false;
  }
}

/**
 * Log activity to Supabase
 */
function logActivity(projectId, type, text) {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/activity_log`;
  const options = {
    method: 'POST',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    payload: JSON.stringify({
      project_id: projectId,
      type: type,
      text: text
    }),
    muteHttpExceptions: true
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.error('Activity log failed:', e.toString());
  }
}

/**
 * Send summary email to admin
 */
function sendSummaryEmail(month, year, created) {
  let totalAmount = 0;
  let details = '';
  
  created.forEach(inv => {
    totalAmount += inv.amount;
    details += `\n• ${inv.name}: ${inv.num} — ₱${inv.amount.toLocaleString()}`;
  });
  
  const subject = `📄 Auto-Invoice Summary: ${month} ${year}`;
  const body = `Auto-invoice generation complete for ${month} ${year}.\n\n`
    + `Generated: ${created.length} invoice(s)\n`
    + `Total: ₱${totalAmount.toLocaleString()}\n`
    + `\n--- Details ---${details}\n\n`
    + `✅ All invoices marked as "sent" — due in ${CONFIG.INVOICE_DUE_DAYS} days.`;
  
  try {
    MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
    console.log(`📧 Summary sent to ${CONFIG.ADMIN_EMAIL}`);
  } catch (e) {
    console.error('Email failed:', e.toString());
  }
}

/**
 * Run this ONCE to set up monthly trigger
 */
function setupTrigger() {
  // Remove existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  // Create new monthly trigger — 1st of month at 8:00 AM
  ScriptApp.newTrigger('generateMonthlyInvoices')
    .timeBased()
    .onMonthDay(1)
    .atHour(8)
    .nearMinute(0)
    .create();
  
  console.log('✅ Monthly trigger set: 1st of each month at 8:00 AM');
  
  // Also send confirmation email
  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, '✅ Auto-Invoice Trigger Active',
    'Monthly invoice automation is now active.\n\n'
    + 'Schedule: Every 1st of the month at 8:00 AM\n'
    + 'Action: Generate invoices for all active projects\n'
    + 'Due: 15 days from generation\n\n'
    + 'You can also run generateMonthlyInvoices() manually anytime.');
}

/**
 * Run to test manually (no trigger needed)
 */
function testRun() {
  console.log('🧪 Test run — generating invoices now...');
  generateMonthlyInvoices();
}
