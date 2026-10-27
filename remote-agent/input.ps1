$ErrorActionPreference = 'Stop'
Add-Type -ReferencedAssemblies System.Web.Extensions -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class NovaInput {
 [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public UNION data; }
 [StructLayout(LayoutKind.Explicit)] public struct UNION { [FieldOffset(0)] public MOUSE mouse; [FieldOffset(0)] public KEY key; }
 [StructLayout(LayoutKind.Sequential)] public struct MOUSE { public int dx,dy; public uint mouseData,flags,time; public UIntPtr extra; }
 [StructLayout(LayoutKind.Sequential)] public struct KEY { public ushort vk,scan; public uint flags,time; public UIntPtr extra; }
 [DllImport("user32.dll")] static extern uint SendInput(uint n,INPUT[] inputs,int size);
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] static extern int GetSystemMetrics(int index);
 public static void Run() {
  var json=new System.Web.Script.Serialization.JavaScriptSerializer(); string line;
  try { while((line=Console.ReadLine())!=null) {
   try { var p=json.Deserialize<Dictionary<string,object>>(line); string type=Convert.ToString(p["type"]);
    switch(type) {
     case "move": Move(Convert.ToDouble(p["x"]),Convert.ToDouble(p["y"])); break;
     case "relative": Relative(Convert.ToInt32(p["dx"]),Convert.ToInt32(p["dy"])); break;
     case "button": if(!Convert.ToBoolean(p["locked"]))Move(Convert.ToDouble(p["x"]),Convert.ToDouble(p["y"]));Button(Convert.ToInt32(p["button"]),Convert.ToBoolean(p["down"]));break;
     case "key": Key(Convert.ToInt32(p["vk"]),Convert.ToBoolean(p["down"]));break;
     case "wheel": Wheel(Convert.ToInt32(p["delta"]));break;
     case "release": Release();break;
     case "probe": Console.WriteLine("NOVA_INPUT_PROBE:"+Convert.ToInt64(p["id"]));break;
    }
   } catch(FormatException) {} catch(ArgumentException) {} catch(KeyNotFoundException) {} }
  } finally {Release();}
 }
 static HashSet<int> held=new HashSet<int>(); static HashSet<int> buttons=new HashSet<int>();
 static void Send(INPUT input){SendInput(1,new[]{input},Marshal.SizeOf(typeof(INPUT)));}
 public static void Move(double x,double y){SetCursorPos((int)(x*(GetSystemMetrics(0)-1)),(int)(y*(GetSystemMetrics(1)-1)));}
 public static void Relative(int x,int y){Send(new INPUT{type=0,data=new UNION{mouse=new MOUSE{dx=x,dy=y,flags=1}}});}
 public static void Key(int vk,bool down){if(down)held.Add(vk);else held.Remove(vk);Send(new INPUT{type=1,data=new UNION{key=new KEY{vk=(ushort)vk,flags=(down?0u:2u)|((vk==163||vk==165||(vk>=33&&vk<=46)||(vk>=91&&vk<=93))?1u:0u)}}});}
 public static void Button(int b,bool down){if(down)buttons.Add(b);else buttons.Remove(b);uint flags=b==0?(down?2u:4u):b==2?(down?8u:16u):(down?32u:64u);Send(new INPUT{type=0,data=new UNION{mouse=new MOUSE{flags=flags}}});}
 public static void Wheel(int delta){Send(new INPUT{type=0,data=new UNION{mouse=new MOUSE{flags=2048,mouseData=unchecked((uint)delta)}}});}
 public static void Release(){foreach(int vk in new List<int>(held))Key(vk,false);foreach(int b in new List<int>(buttons))Button(b,false);}
}
"@
[NovaInput]::SetProcessDPIAware() | Out-Null
[Console]::WriteLine('NOVA_INPUT_READY')
[NovaInput]::Run()
