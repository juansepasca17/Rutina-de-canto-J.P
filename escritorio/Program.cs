// Vocalia de escritorio: extrae los archivos incrustados en %LOCALAPPDATA%\Vocalia y abre la app en una
// ventana propia con WebView2. No hay servidor: los archivos se sirven desde disco con un host virtual.

using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace Vocalia
{
    static class Program
    {
        [DllImport("kernel32", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern IntPtr LoadLibrary(string path);

        [DllImport("user32")]
        static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32")]
        static extern bool ShowWindow(IntPtr hWnd, int cmd);

        internal static string WebDir;
        internal static string DataDir;
        static string libDir;

        [STAThread]
        static void Main()
        {
            // Una sola ventana: si ya está abierta, la traemos al frente.
            using (var mutex = new Mutex(true, "Vocalia.App.Instancia", out bool first))
            {
                if (!first)
                {
                    FocusExisting();
                    return;
                }

                string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Vocalia");
                string build = Assembly.GetExecutingAssembly().ManifestModule.ModuleVersionId.ToString("N").Substring(0, 12);
                string appDir = Path.Combine(root, "app", build);
                WebDir = Path.Combine(appDir, "web");
                libDir = Path.Combine(appDir, "lib");
                DataDir = Path.Combine(root, "datos");

                try
                {
                    Extract(Path.Combine(root, "app"), appDir);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("No pude preparar los archivos de Vocalia:\n\n" + ex.Message, "Vocalia", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                AppDomain.CurrentDomain.AssemblyResolve += (s, e) =>
                {
                    string path = Path.Combine(libDir, new AssemblyName(e.Name).Name + ".dll");
                    return File.Exists(path) ? Assembly.LoadFrom(path) : null;
                };
                LoadLibrary(Path.Combine(libDir, "WebView2Loader.dll"));

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Run();
            }
        }

        // Separado de Main para que las DLL de WebView2 se carguen después de registrar AssemblyResolve.
        [MethodImpl(MethodImplOptions.NoInlining)]
        static void Run() => Application.Run(new MainForm());

        /// <summary>Escribe los recursos incrustados (web/ y lib/) en una carpeta por versión del .exe.</summary>
        static void Extract(string appsRoot, string appDir)
        {
            if (!Directory.Exists(appDir))
            {
                var asm = Assembly.GetExecutingAssembly();
                string tmp = appDir + ".tmp-" + Process.GetCurrentProcess().Id;
                if (Directory.Exists(tmp)) Directory.Delete(tmp, true);
                foreach (string name in asm.GetManifestResourceNames())
                {
                    string rel = name.Replace('\\', '/');
                    if (!rel.StartsWith("web/") && !rel.StartsWith("lib/")) continue;
                    string dest = Path.Combine(tmp, rel.Replace('/', Path.DirectorySeparatorChar));
                    Directory.CreateDirectory(Path.GetDirectoryName(dest));
                    using (var src = asm.GetManifestResourceStream(name))
                    using (var dst = File.Create(dest))
                        src.CopyTo(dst);
                }
                Directory.Move(tmp, appDir);
            }

            // Borra versiones viejas (si alguna está en uso, se intenta la próxima vez).
            foreach (string dir in Directory.GetDirectories(appsRoot))
            {
                if (string.Equals(dir, appDir, StringComparison.OrdinalIgnoreCase)) continue;
                try { Directory.Delete(dir, true); } catch { }
            }
        }

        static void FocusExisting()
        {
            var me = Process.GetCurrentProcess();
            foreach (var p in Process.GetProcessesByName(me.ProcessName))
            {
                if (p.Id == me.Id || p.MainWindowHandle == IntPtr.Zero) continue;
                ShowWindow(p.MainWindowHandle, 9); // SW_RESTORE
                SetForegroundWindow(p.MainWindowHandle);
                return;
            }
        }
    }
}
