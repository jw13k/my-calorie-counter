try { eval($code); WScript.Echo('Syntax OK'); } catch (e) { WScript.Echo('Error: ' + e.message); }
