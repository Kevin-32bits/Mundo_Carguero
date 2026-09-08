namespace Api_M_Carguero.Services.Common;

public sealed class SystemApplicationClock : IApplicationClock
{
    public DateTime Now => DateTime.Now;
}
