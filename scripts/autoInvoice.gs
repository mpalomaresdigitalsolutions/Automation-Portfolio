/**
 * AUTO INVOICE — Google Apps Script
 * Runs every Monday. Creates invoices for projects with weekly_services
 * Saves to Supabase invoices table via REST API
 * 
 * SETUP:
 * 1. Go to https://script.google.com/
 * 2. Create New Project -> paste this code
 * 3. Replace SUPABASE_ANON_KEY below
 * 4. Run -> setupTrigger() once to create weekly schedule
 * 5. Review -> Executions tab to see results
 */

const CONFIG = {
  SUPABASE_URL: 'https://dkkriesneublbmrihgvp.supabase.co',
  // ⚠️ Replace with your actual Supabase anon key (or service_role key)
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra3JpZXNuZXVibGJtcmloZ3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzk2NjIsImV4cCI6MjA5ODMxNTY2Mn0.xBzuqJ4kCLWMxvT6CRNIpSMDVcBQvq42Xeg0OnHfPCY',
  ADMIN_EMAIL: 'admin@mpalomares.com', // for notifications
  INVOICE_DUE_DAYS: 7, // days from generation (weekly)
  INVOICE_DESCRIPTION: 'Weekly Service Fee'
};

/**
 * Main function — run on schedule or manually
 * Fetches active projects, generates invoice for each
 */
function processWeeklyInvoices() {
  const today = new Date();
  const weekStr = today.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  console.log(`🔄 Auto-Invoice Generation: Week of ${weekStr}`);
  
  // 1. Fetch projects with weekly_services from Supabase
  const projects = fetchActiveProjects();
  if (!projects || !projects.length) { console.log('No active projects'); return; }
  
  console.log(`Found ${projects.length} project(s) with weekly services`);
  
  // 2. Get last invoice number
  const lastNum = getLastInvoiceNumber();
  let nextNum = lastNum + 1;
  var created = 0, errors = 0, results = [];
  
  // 3. Generate invoice for each project
  for (var i = 0; i < projects.length; i++) {
    var project = projects[i];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + CONFIG.INVOICE_DUE_DAYS);
    
    const invoiceNum = '#IV-' + String(nextNum).padStart(5, '0');
    const amount = Number(project.weekly_amount || project.budget || 0);
    
    if (amount <= 0) {
      console.log(`Skipping ${project.name}: amount is 0`);
      return;
    }
    
    const invoiceData = {
      project_id: project.id,
      invoice_num: invoiceNum,
      title: `Week of ${weekStr} — ${CONFIG.INVOICE_DESCRIPTION}`,
      amount: amount,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'sent'
    };
    
    const result = insertInvoice(invoiceData);
    if (result) {
      created++;
      var clientInfo = project.clients || {};
      results.push({ name: clientInfo.name || project.name, num: invoiceNum, amount: amount });
      logActivity(project.id, 'invoice', 
        `Invoice ${invoiceNum} sent — ₱${amount.toLocaleString()}`);
      
      // Email invoice to client
      if (clientInfo.email) {
        sendInvoiceEmail(clientInfo.email, clientInfo.name || project.name, invoiceNum, amount, dueDate.toISOString().split('T')[0], invoiceData.title);
      }
    }
    
    nextNum++;
  }
  
  // 4. Send summary email
  if (created > 0) {
    sendSummaryEmail(created, errors, results);
  }
  
  console.log(`✅ Generated ${created} invoice(s), ${errors} error(s)`);
}

/**
 * Fetch projects that have weekly_services enabled
 */
function fetchActiveProjects() {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/projects?select=*,clients!inner(email,name)&status=in.(active,review)&weekly_services=eq.true`;
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
function sendSummaryEmail(created, errors, results) {
  let totalAmount = 0;
  let details = '';
  
  results.forEach(inv => {
    totalAmount += inv.amount;
    details += `\n• ${inv.name}: ${inv.num} — ₱${inv.amount.toLocaleString()}`;
  });
  
  const weekStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric' });
  const subject = `📄 Auto-Invoice: Week of ${weekStr}`;
  const body = `Weekly auto-invoice generation complete.\n\n`
    + `Created: ${created} invoice(s)\n`
    + `Errors: ${errors}\n`
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
 * Email invoice to client
 */
function sendInvoiceEmail(clientEmail, clientName, invoiceNum, amount, dueDate, title) {
  const dueDisplay = new Date(dueDate + 'T12:00:00').toLocaleDateString('en-US', { 
    month: 'long', day: 'numeric', year: 'numeric' 
  });
  
  const subject = `📄 Invoice ${invoiceNum} — MPalomares Digital Solutions`;
  const body = `Hi ${clientName},

A new invoice has been generated for your project.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  INVOICE #${invoiceNum}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Title: ${title}
  Amount: ₱${amount.toLocaleString()}.00
  Due Date: ${dueDisplay}
  Status: Sent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payment is due within ${CONFIG.INVOICE_DUE_DAYS} days.

You can view all your invoices at:
${CONFIG.SUPABASE_URL}/portal.html

For questions, contact:
admin@mpalomares.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MPalomares Digital Solutions
`;

  try {
    MailApp.sendEmail(clientEmail, subject, body);
    console.log(`📧 Invoice ${invoiceNum} emailed to ${clientEmail}`);
  } catch (e) {
    console.error(`Failed to email ${clientEmail}: ${e.toString()}`);
  }
}

/**
 * Run this ONCE to set up monthly trigger
 */
function setupTrigger() {
  // Remove existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  // Create new weekly trigger — every Monday at 8:00 AM
  ScriptApp.newTrigger('processWeeklyInvoices')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .nearMinute(0)
    .create();
  
  console.log('✅ Weekly trigger set: Every Monday at 8:00 AM');
  
  // Also send confirmation email
  MailApp.sendEmail(CONFIG.ADMIN_EMAIL, '✅ Auto-Invoice Trigger Active',
    'Weekly invoice automation is now active.\n\n'
    + 'Schedule: Every Monday at 8:00 AM\n'
    + 'Action: Generate invoices for projects with weekly_services\n'
    + 'Due: 7 days from generation\n\n'
    + 'You can also run processWeeklyInvoices() manually anytime.');
}

/**
 * Run to test manually (no trigger needed)
 */
function testRun() {
  console.log('🧪 Test run — generating weekly invoices now...');
  processWeeklyInvoices();
}
