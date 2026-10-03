using System;
using System.Diagnostics;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Vocalia
{
    sealed class MainForm : Form
    {
        // Dominio reservado (.example): nunca sale a internet, solo apunta a la carpeta local.
        const string Host = "vocalia.example";
        static readonly string Home = "https://" + Host + "/index.html";

        readonly WebView2 web = new WebView2();

        public MainForm()
        {
            Text = "Vocalia";
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            AutoScaleMode = AutoScaleMode.Dpi;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(1040, 820);
            MinimumSize = new Size(420, 620);
            BackColor = Color.FromArgb(14, 16, 36);

            web.Dock = DockStyle.Fill;
            web.DefaultBackgroundColor = BackColor;
            Controls.Add(web);

            Load += async (s, e) => await InitAsync();
        }

        async Task InitAsync()
        {
            try
            {
                var env = await CoreWebView2Environment.CreateAsync(null, Program.DataDir);
                await web.EnsureCoreWebView2Async(env);
            }
            catch (WebView2RuntimeNotFoundException)
            {
                MessageBox.Show("Falta el componente WebView2 de Microsoft (viene con Windows 11).\nInstálalo desde https://go.microsoft.com/fwlink/p/?LinkId=2124703 y vuelve a abrir Vocalia.",
                    "Vocalia", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
                return;
            }
            catch (Exception ex)
            {
                MessageBox.Show("No pude iniciar la ventana de Vocalia:\n\n" + ex.Message, "Vocalia", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
                return;
            }

            var core = web.CoreWebView2;
            core.SetVirtualHostNameToFolderMapping(Host, Program.WebDir, CoreWebView2HostResourceAccessKind.Allow);

            var settings = core.Settings;
            settings.IsStatusBarEnabled = false;
            settings.AreDefaultContextMenusEnabled = false;
            settings.IsPasswordAutosaveEnabled = false;
            settings.IsGeneralAutofillEnabled = false;
#if !DEBUG
            settings.AreDevToolsEnabled = false;
#endif

            // El micrófono se concede solo a la propia app (los minijuegos lo necesitan).
            core.PermissionRequested += (s, e) =>
            {
                if (!e.Uri.StartsWith("https://" + Host + "/", StringComparison.OrdinalIgnoreCase)) return;
                if (e.PermissionKind == CoreWebView2PermissionKind.Microphone)
                {
                    e.State = CoreWebView2PermissionState.Allow;
                    e.SavesInProfile = true;
                }
            };

            // Cualquier enlace externo se abre en el navegador normal, nunca dentro de la app.
            core.NewWindowRequested += (s, e) =>
            {
                e.Handled = true;
                OpenExternal(e.Uri);
            };
            core.NavigationStarting += (s, e) =>
            {
                if (e.Uri.StartsWith("https://" + Host + "/", StringComparison.OrdinalIgnoreCase)) return;
                e.Cancel = true;
                OpenExternal(e.Uri);
            };

            core.Navigate(Home);
        }

        static void OpenExternal(string uri)
        {
            if (!uri.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !uri.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) return;
            try { Process.Start(new ProcessStartInfo(uri) { UseShellExecute = true }); } catch { }
        }
    }
}
