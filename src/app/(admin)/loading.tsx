export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent shadow-xs" />
        <p className="text-xs font-semibold text-slate-500 animate-pulse">
          Loading Admin Workspace...
        </p>
      </div>
    </div>
  );
}
