; =====================================================================
; GymERP Windows Desktop Installer Script (Inno Setup 6+)
; Compiles a single-file GymERP-Setup.exe installer for Windows 10/11
; =====================================================================

#define MyAppName "GymERP"
#define MyAppVersion "2.6"
#define MyAppPublisher "GymERP Team"
#define MyAppURL "https://github.com/prashantb2400/GYM-ERP-2"
#define MyAppExeName "start-gymerp.bat"

[Setup]
AppId={{7B8B799E-1F92-4F3D-9473-1C713B821A93}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
LicenseFile=..\LICENSE
OutputDir=..\dist
OutputBaseFilename=GymERP-v{#MyAppVersion}-Windows-Setup
SetupIconFile=..\public\icon-512.png
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "autostart"; Description: "Automatically launch GymERP when Windows starts"; GroupDescription: "System Startup:"; Flags: unchecked
Name: "firewall"; Description: "Add Windows Firewall rule to allow lobby tablet access"; GroupDescription: "Network Permissions:"; Flags: checked

[Files]
Source: "..\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\docker-compose.offline.yml"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\next.config.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\deploy\*"; DestDir: "{app}\deploy"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\supabase\migrations\*"; DestDir: "{app}\supabase\migrations"; Flags: ignoreversion recursesubdirs createallsubdirs
; Optional pre-built standalone app directory
Source: "..\.next\*"; DestDir: "{app}\.next"; Flags: ignoreversion recursesubdirs createallsubdirs; Tasks: ; Flags: skipifsourcedoesntexist
Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs; Tasks: ; Flags: skipifsourcedoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\public\icon-512.png"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\public\icon-512.png"; Tasks: desktopicon
Name: "{commonstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: autostart

[Run]
; Add Windows Firewall exceptions during setup
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""GymERP Web (Port 3000)"" dir=in action=allow protocol=TCP localport=3000"; Flags: runhidden; Tasks: firewall
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""GymERP PostgREST (Port 54321)"" dir=in action=allow protocol=TCP localport=54321"; Flags: runhidden; Tasks: firewall
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""GymERP WhatsApp Bridge (Port 48291)"" dir=in action=allow protocol=TCP localport=48291"; Flags: runhidden; Tasks: firewall

; Option to launch GymERP after installation completes
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""GymERP Web (Port 3000)"""; Flags: runhidden
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""GymERP PostgREST (Port 54321)"""; Flags: runhidden
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""GymERP WhatsApp Bridge (Port 48291)"""; Flags: runhidden
