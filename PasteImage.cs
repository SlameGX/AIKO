using System;
using System.Drawing;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace PasteImage
{
    class Program
    {
        [DllImport("user32.dll", SetLastError = true)]
        static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [StructLayout(LayoutKind.Sequential)]
        struct INPUT
        {
            public uint type;
            public InputUnion u;
        }

        [StructLayout(LayoutKind.Explicit)]
        struct InputUnion
        {
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public KEYBDINPUT ki;
            [FieldOffset(0)] public HARDWAREINPUT hi;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct MOUSEINPUT
        {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct KEYBDINPUT
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct HARDWAREINPUT
        {
            public uint uMsg;
            public ushort wParamL;
            public ushort wParamH;
        }

        const uint INPUT_KEYBOARD = 1;
        const uint KEYEVENTF_KEYUP = 0x0002;
        const ushort VK_CONTROL = 0x11;
        const ushort VK_V = 0x56;
        const ushort VK_RETURN = 0x0D;

        static void SendCtrlV()
        {
            INPUT[] inputs = new INPUT[4];
            
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].u.ki.wVk = VK_CONTROL;
            
            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].u.ki.wVk = VK_V;
            
            inputs[2].type = INPUT_KEYBOARD;
            inputs[2].u.ki.wVk = VK_V;
            inputs[2].u.ki.dwFlags = KEYEVENTF_KEYUP;
            
            inputs[3].type = INPUT_KEYBOARD;
            inputs[3].u.ki.wVk = VK_CONTROL;
            inputs[3].u.ki.dwFlags = KEYEVENTF_KEYUP;
            
            SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        static void SendEnter()
        {
            INPUT[] inputs = new INPUT[2];
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].u.ki.wVk = VK_RETURN;
            inputs[0].u.ki.wScan = 0;
            inputs[0].u.ki.dwFlags = 0;

            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].u.ki.wVk = VK_RETURN;
            inputs[1].u.ki.wScan = 0;
            inputs[1].u.ki.dwFlags = KEYEVENTF_KEYUP;
            
            SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        [STAThread]
        static void Main(string[] args)
        {
            if (args.Length == 0) return;
            
            try
            {
                string path = args[0];
                
                using (Image img = Image.FromFile(path))
                {
                    Clipboard.SetImage(img);
                }
                
                Thread.Sleep(300);
                SendCtrlV();
                
                Thread.Sleep(500); // Wait for the app (like Discord) to register the paste before hitting enter
                SendEnter();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }
        }
    }
}
