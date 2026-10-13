using System;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;

namespace HutatmaBooking.WebForms
{
    internal static class SqlStore
    {
        private static string ConnectionString
        {
            get
            {
                var setting = ConfigurationManager.ConnectionStrings["HutatmaBooking"];
                if (setting == null || String.IsNullOrWhiteSpace(setting.ConnectionString))
                    throw new InvalidOperationException("The HutatmaBooking SQL Server connection string is not configured.");
                return setting.ConnectionString;
            }
        }

        internal static DataTable Query(string sql, params SqlParameter[] parameters)
        {
            using (var connection = new SqlConnection(ConnectionString))
            using (var command = new SqlCommand(sql, connection))
            using (var adapter = new SqlDataAdapter(command))
            {
                if (parameters != null) command.Parameters.AddRange(parameters);
                var table = new DataTable();
                adapter.Fill(table);
                return table;
            }
        }

        internal static int Execute(string sql, params SqlParameter[] parameters)
        {
            using (var connection = new SqlConnection(ConnectionString))
            using (var command = new SqlCommand(sql, connection))
            {
                if (parameters != null) command.Parameters.AddRange(parameters);
                connection.Open();
                return command.ExecuteNonQuery();
            }
        }

        internal static SqlParameter Parameter(string name, SqlDbType type, object value, int size)
        {
            var parameter = new SqlParameter(name, type);
            if (size != 0) parameter.Size = size;
            parameter.Value = value ?? DBNull.Value;
            return parameter;
        }
    }
}
