using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace DrawCircleApp {
    public class CircleOverlay : Form {
        public const int WS_EX_TRANSPARENT = 0x00000020;
        public const int WS_EX_LAYERED = 0x00080000;

        protected override CreateParams CreateParams {
            get {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= WS_EX_LAYERED | WS_EX_TRANSPARENT;
                return cp;
            }
        }

        private int targetX;
        private int targetY;
        private Timer closeTimer;

        public CircleOverlay(int x, int y) {
            this.targetX = x;
            this.targetY = y;
            this.FormBorderStyle = FormBorderStyle.None;
            this.TopMost = true;
            this.StartPosition = FormStartPosition.Manual;
            
            // Cover all screens
            Rectangle bounds = Screen.PrimaryScreen.Bounds;
            foreach (var screen in Screen.AllScreens) {
                bounds = Rectangle.Union(bounds, screen.Bounds);
            }
            this.Bounds = bounds;
            
            this.BackColor = Color.Magenta;
            this.TransparencyKey = Color.Magenta;
            this.ShowInTaskbar = false;

            closeTimer = new Timer();
            closeTimer.Interval = 5000; // 5 seconds
            closeTimer.Tick += (s, e) => { this.Close(); };
            closeTimer.Start();
        }

        protected override void OnPaint(PaintEventArgs e) {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            
            // Draw a thick red circle
            Pen pen = new Pen(Color.Red, 8);
            int r = 40;
            g.DrawEllipse(pen, targetX - r, targetY - r, r * 2, r * 2);
        }

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [STAThread]
        static void Main(string[] args) {
            if (Environment.OSVersion.Version.Major >= 6) {
                SetProcessDPIAware();
            }
            if (args.Length >= 2) {
                int x, y;
                if (int.TryParse(args[0], out x) && int.TryParse(args[1], out y)) {
                    Application.EnableVisualStyles();
                    Application.Run(new CircleOverlay(x, y));
                }
            }
        }
    }
}
