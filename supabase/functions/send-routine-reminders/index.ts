import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sesEndpoint = Deno.env.get("SES_ENDPOINT")!;

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current date
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + 2); // 48 hours from now
    const reminderDateStr = reminderDate.toISOString().split("T")[0];

    console.log(`Checking for sessions on ${reminderDateStr}`);

    // Get all scheduled bookings for 48 hours from now that haven't had reminders sent
    const { data: bookings, error } = await supabase
      .from("routine_bookings")
      .select(`
        *,
        project:projects(id, title, location),
        client:profiles!routine_bookings_client_id_fkey(id, email, full_name),
        provider:profiles!routine_bookings_provider_id_fkey(id, email, full_name)
      `)
      .eq("session_date", reminderDateStr)
      .eq("status", "scheduled")
      .eq("reminder_sent", false);

    if (error) throw error;

    console.log(`Found ${bookings?.length || 0} bookings to send reminders for`);

    let successCount = 0;
    let failCount = 0;

    // Send reminders to both client and provider for each booking
    for (const booking of bookings || []) {
      try {
        const projectTitle = booking.project?.title || "Your Project";
        const location = booking.project?.location || "Location TBD";

        // Send to client
        if (booking.client?.email) {
          await sendReminderEmail(
            booking.client.email,
            booking.client.full_name || "there",
            "client",
            booking.provider?.full_name || "Service Provider",
            projectTitle,
            booking.session_date,
            location
          );
        }

        // Send to provider
        if (booking.provider?.email) {
          await sendReminderEmail(
            booking.provider.email,
            booking.provider.full_name || "there",
            "provider",
            booking.client?.full_name || "Client",
            projectTitle,
            booking.session_date,
            location
          );
        }

        // Mark reminder as sent
        await supabase
          .from("routine_bookings")
          .update({ reminder_sent: true })
          .eq("id", booking.id);

        successCount++;
      } catch (emailError) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, emailError);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} reminders, ${failCount} failed`,
        totalBookings: bookings?.length || 0
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error in send-routine-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});

async function sendReminderEmail(
  recipientEmail: string,
  recipientName: string,
  recipientRole: "client" | "provider",
  otherPartyName: string,
  projectTitle: string,
  sessionDate: string,
  location: string
): Promise<void> {
  const formattedDate = new Date(sessionDate).toLocaleDateString("en-NZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const subject = `BlueTika: Session Reminder - ${projectTitle}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1B4FD8; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .date-box { background: #E0F2FE; border: 2px solid #06B6D4; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
        .date { font-size: 24px; font-weight: bold; color: #1B4FD8; }
        .info-box { background: white; border: 1px solid #E5E7EB; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .button { display: inline-block; background: #06B6D4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Session in 48 Hours</h1>
        </div>
        <div class="content">
          <p>Kia ora ${recipientName},</p>
          
          <p>This is a reminder that you have a scheduled session coming up:</p>
          
          <div class="date-box">
            <div class="date">${formattedDate}</div>
          </div>
          
          <div class="info-box">
            <p><strong>Project:</strong> ${projectTitle}</p>
            <p><strong>${recipientRole === "client" ? "Service Provider" : "Client"}:</strong> ${otherPartyName}</p>
            <p><strong>Location:</strong> ${location}</p>
          </div>
          
          <p><strong>What to prepare:</strong></p>
          <ul>
            ${recipientRole === "client" ? `
              <li>Ensure the location is accessible</li>
              <li>Have any special requirements ready</li>
              <li>Be available to communicate if needed</li>
            ` : `
              <li>Confirm you have all necessary equipment</li>
              <li>Plan your route to the location</li>
              <li>Review any special client requirements</li>
            `}
          </ul>
          
          <div style="text-align: center;">
            <a href="https://bluetika.co.nz/contracts" class="button">View Details</a>
            <a href="https://bluetika.co.nz/contracts" class="button">Add to Calendar</a>
          </div>
          
          <p>If you need to reschedule or have any questions, please contact ${otherPartyName} directly.</p>
          
          <p>Ngā mihi,<br>The BlueTika Team</p>
        </div>
        <div class="footer">
          <p>100% NZ Owned · Kiwis Helping Kiwis · bluetika.co.nz</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
BlueTika - Session Reminder

Kia ora ${recipientName},

This is a reminder that you have a scheduled session coming up:

${formattedDate}

Project: ${projectTitle}
${recipientRole === "client" ? "Service Provider" : "Client"}: ${otherPartyName}
Location: ${location}

View details at: https://bluetika.co.nz/contracts

Ngā mihi,
The BlueTika Team

100% NZ Owned · Kiwis Helping Kiwis · bluetika.co.nz
  `.trim();

  const response = await fetch(sesEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "noreply@bluetika.co.nz",
      to: recipientEmail,
      subject,
      htmlBody,
      textBody
    })
  });

  if (!response.ok) {
    throw new Error(`SES email failed: ${await response.text()}`);
  }
}