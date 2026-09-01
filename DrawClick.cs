using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace DrawClickApp {
    public class ClickOverlay : Form {
        public const int WS_EX_TRANSPARENT = 0x00000020;
        public const int WS_EX_LAYERED = 0x00080000;
        public const int WS_EX_NOACTIVATE = 0x08000000;

        protected override CreateParams CreateParams {
            get {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_NOACTIVATE;
                return cp;
            }
        }

        protected override bool ShowWithoutActivation {
            get { return true; }
        }

        private int targetX;
        private int targetY;
        private Timer animTimer;
        private int radius = 5;
        private int maxRadius = 35;
        private int opacity = 255;
        private Color clickColor;

        public ClickOverlay(int x, int y, bool isDoubleClick) {
            this.targetX = x;
            this.targetY = y;
            // Orange for click, Blue for double click
            this.clickColor = isDoubleClick ? Color.DeepSkyBlue : Color.OrangeRed;
            
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

            animTimer = new Timer();
            animTimer.Interval = 20; // 50 fps
            animTimer.Tick += AnimTimer_Tick;
            animTimer.Start();
        }

        private void AnimTimer_Tick(object sender, EventArgs e) {
            radius += 3;
            opacity -= 20;
            
            if (opacity <= 0 || radius >= maxRadius) {
                animTimer.Stop();
                this.Close();
            } else {
                this.Invalidate();
            }
        }

        protected override void OnPaint(PaintEventArgs e) {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            
            if (opacity > 0) {
                Color drawColor = Color.FromArgb(opacity, clickColor.R, clickColor.G, clickColor.B);
                using (Pen pen = new Pen(drawColor, 4)) {
                    g.DrawEllipse(pen, targetX - radius, targetY - radius, radius * 2, radius * 2);
                }
                
                int innerOpacity = Math.Max(0, opacity - 100);
                using (SolidBrush brush = new SolidBrush(Color.FromArgb(innerOpacity, clickColor.R, clickColor.G, clickColor.B))) {
                    g.FillEllipse(brush, targetX - radius, targetY - radius, radius * 2, radius * 2);
                }
            }
        }

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [STAThread]
        static void Main(string[] args) {
            if (Environment.OSVersion.Version.Major >= 6) {
                SetProcessDPIAware();
            }
            if (args.Length >= 2) {
                int x;
                int y;
                if (int.TryParse(args[0], out x) && int.TryParse(args[1], out y)) {
                    bool isDoubleClick = args.Length > 2 && args[2] == "double";
                    Application.EnableVisualStyles();
                    Application.Run(new ClickOverlay(x, y, isDoubleClick));
                }
            }
        }
    }
}
