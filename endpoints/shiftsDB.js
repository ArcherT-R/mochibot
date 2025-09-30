// endpoints/shiftsDB.js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// -------------------------
// Shifts
// -------------------------

// Get all shifts
async function getAllShifts() {
    const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .order("time", { ascending: true });
    if (error) throw error;
    return data;
}

// Get attendees for a shift
async function getShiftAttendees(shiftId) {
    const { data, error } = await supabase
        .from("shift_attendees")
        .select("username")
        .eq("shift_id", shiftId);
    if (error) throw error;
    return data || [];
}

// Add attendee
async function addShiftAttendee(shiftId, username) {
    // Prevent duplicates
    const { data: exists } = await supabase
        .from("shift_attendees")
        .select("*")
        .eq("shift_id", shiftId)
        .eq("username", username)
        .single();
    
    if (!exists) {
        const { error } = await supabase
            .from("shift_attendees")
            .insert([{ shift_id: shiftId, username }]);
        if (error) throw error;
    }
    return true;
}

// Remove attendee
async function removeShiftAttendee(shiftId, username) {
    const { error } = await supabase
        .from("shift_attendees")
        .delete()
        .eq("shift_id", shiftId)
        .eq("username", username);
    if (error) throw error;
    return true;
}

module.exports = {
    getAllShifts,
    getShiftAttendees,
    addShiftAttendee,
    removeShiftAttendee
};
