using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace HutatmaBooking.API.Utils;

public sealed class DateOnlyJsonConverter : JsonConverter<DateOnly>
{
    private readonly string _format;
    public DateOnlyJsonConverter(string format = "yyyy-MM-dd") => _format = format;

    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var s = reader.GetString();
        if (string.IsNullOrEmpty(s)) return default;
        if (DateOnly.TryParseExact(s, _format, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d))
            return d;
        if (DateOnly.TryParse(s, out d))
            return d;
        throw new JsonException($"Unable to parse DateOnly value: '{s}'");
    }

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString(_format));
    }
}

public sealed class NullableDateOnlyJsonConverter : JsonConverter<DateOnly?>
{
    private readonly string _format;
    public NullableDateOnlyJsonConverter(string format = "yyyy-MM-dd") => _format = format;

    public override DateOnly? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        var s = reader.GetString();
        if (string.IsNullOrEmpty(s)) return null;
        if (DateOnly.TryParseExact(s, _format, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d))
            return d;
        if (DateOnly.TryParse(s, out d))
            return d;
        throw new JsonException($"Unable to parse DateOnly value: '{s}'");
    }

    public override void Write(Utf8JsonWriter writer, DateOnly? value, JsonSerializerOptions options)
    {
        if (value.HasValue) writer.WriteStringValue(value.Value.ToString(_format));
        else writer.WriteNullValue();
    }
}
