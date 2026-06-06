export function ChartLegend() {
  return (
    <div className="flex items-center gap-6 justify-center mt-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="inline-block w-8 h-3 rounded" style={{ background: "hsl(221.2 83.2% 53.3% / 0.8)" }} />
        Faktiskt
      </div>
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-8 h-3 rounded"
          style={{
            background: "hsl(221.2 83.2% 53.3% / 0.3)",
            border: "1.5px dashed hsl(221.2 83.2% 53.3%)",
          }}
        />
        Prognos
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-8 h-0.5 rounded" style={{ background: "hsl(221.2 83.2% 25%)" }} />
        Saldo
      </div>
    </div>
  );
}
