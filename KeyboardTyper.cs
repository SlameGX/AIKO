using System;
using System.Text;
using System.Windows.Forms;
using System.Threading;

namespace KeyboardTyper
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            if (args.Length == 0) return;
            
            try {
                byte[] data = Convert.FromBase64String(args[0]);
                string text = Encoding.UTF8.GetString(data);
                
                bool pressEnter = (args.Length > 1 && args[1].ToLower() == "enter");
                
                // Give target window time to focus after the click happens
                Thread.Sleep(300); 

                string escapedText = EscapeSendKeys(text);
                
                if (!string.IsNullOrEmpty(escapedText)) {
                    SendKeys.SendWait(escapedText);
                }
                
                if (pressEnter) {
                    SendKeys.SendWait("{ENTER}");
                }
            }
            catch (Exception ex) {
                // Ignore exceptions silently for winexe
            }
        }
        
        static string EscapeSendKeys(string str)
        {
            StringBuilder sb = new StringBuilder();
            foreach(char c in str)
            {
                if(c == '{' || c == '}' || c == '+' || c == '^' || c == '%' || c == '~' || c == '(' || c == ')')
                    sb.Append("{" + c + "}");
                else
                    sb.Append(c);
            }
            return sb.ToString();
        }
    }
}
