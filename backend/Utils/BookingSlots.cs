using HutatmaBooking.API.Models;

namespace HutatmaBooking.API.Utils;

public static class BookingSlots
{
    public static readonly string[] OrderedSessions = { "Morning", "Afternoon", "Evening" };

    public static bool TryParse(string? value, out List<string> selectedSessions)
    {
        selectedSessions = new List<string>();
        if (string.IsNullOrWhiteSpace(value)) return false;

        if (value.Trim().Equals("FullDay", StringComparison.OrdinalIgnoreCase))
        {
            selectedSessions.AddRange(OrderedSessions);
            return true;
        }

        var supplied = value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (supplied.Length == 0 || supplied.Any(session =>
                !OrderedSessions.Contains(session, StringComparer.OrdinalIgnoreCase)))
            return false;

        var unique = new HashSet<string>(supplied, StringComparer.OrdinalIgnoreCase);
        if (unique.Count != supplied.Length) return false;
        selectedSessions.AddRange(OrderedSessions.Where(unique.Contains));
        return true;
    }

    public static string Normalize(IEnumerable<string> sessions)
    {
        var supplied = sessions.ToArray();
        if (supplied.Length == 0 || supplied.Any(session =>
                !OrderedSessions.Contains(session, StringComparer.OrdinalIgnoreCase)))
            throw new ArgumentException("Select at least one valid booking slot.", nameof(sessions));

        var unique = new HashSet<string>(supplied, StringComparer.OrdinalIgnoreCase);
        if (unique.Count != supplied.Length)
            throw new ArgumentException("A booking slot cannot be selected more than once.", nameof(sessions));

        var ordered = OrderedSessions.Where(unique.Contains).ToArray();
        return ordered.Length == OrderedSessions.Length ? "FullDay" : string.Join(',', ordered);
    }

    public static int CountPerDay(string session)
    {
        if (!TryParse(session, out var selectedSessions))
            throw new ArgumentException("Select at least one valid booking slot.", nameof(session));
        return selectedSessions.Count;
    }

    public static int CapacityFor(VenueMaster venue, string session) => session switch
    {
        "Morning" => venue.MorningBookingCapacity,
        "Afternoon" => venue.AfternoonBookingCapacity,
        "Evening" => venue.EveningBookingCapacity,
        _ => 0,
    };

    public static bool IsActiveBooking(Booking booking) =>
        !booking.Status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)
        && !booking.Status.Equals("ForceCancelled", StringComparison.OrdinalIgnoreCase)
        && !booking.Status.Equals("Force Cancelled", StringComparison.OrdinalIgnoreCase);

    public static bool HasCapacityConflict(
        IEnumerable<Booking> bookings,
        DateOnly fromDate,
        DateOnly toDate,
        string session,
        VenueMaster venue,
        int? excludedBookingId = null)
    {
        if (!TryParse(session, out var requestedSessions)) return true;

        var activeBookings = bookings
            .Where(booking => IsActiveBooking(booking) && booking.Id != excludedBookingId)
            .ToList();
        if (requestedSessions.Count == OrderedSessions.Length
            && activeBookings.Any(booking => booking.FromDate <= toDate && booking.ToDate >= fromDate))
            return true;

        if (activeBookings.Any(booking =>
                TryParse(booking.Session, out var bookedSessions)
                && bookedSessions.Count == OrderedSessions.Length
                && booking.FromDate <= toDate
                && booking.ToDate >= fromDate))
            return true;

        for (var date = fromDate; date <= toDate; date = date.AddDays(1))
        {
            foreach (var requestedSession in requestedSessions)
            {
                var capacity = CapacityFor(venue, requestedSession);
                if (capacity <= 0) return true;

                var bookingsForSlot = activeBookings.Count(booking =>
                    booking.FromDate <= date
                    && booking.ToDate >= date
                    && TryParse(booking.Session, out var bookedSessions)
                    && bookedSessions.Contains(requestedSession, StringComparer.OrdinalIgnoreCase));
                if (bookingsForSlot > 0) return true;
            }
        }

        return false;
    }
}