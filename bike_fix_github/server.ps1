$port = 8080
$server = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$server.Start()
Write-Host "TCP Web Server started on port $port for 0.0.0.0"

while ($true) {
    try {
        $client = $server.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        $requestLine = $reader.ReadLine()
        
        if ($requestLine) {
            $parts = $requestLine.Split(" ")
            if ($parts.Length -ge 2) {
                $rawPath = $parts[1]
                if ($rawPath -eq "/" -or [string]::IsNullOrWhiteSpace($rawPath)) {
                    $rawPath = "/index_mobile.html"
                }
                
                # Remove query string if any
                if ($rawPath.Contains("?")) {
                    $rawPath = $rawPath.Substring(0, $rawPath.IndexOf("?"))
                }
                
                $cleanPath = $rawPath.TrimStart("/").Replace("/", "\")
                $filePath = Join-Path "C:\Users\luk08\Desktop\bike_fix" $cleanPath
                
                $writer = New-Object System.IO.StreamWriter($stream, [System.Text.Encoding]::UTF8)
                if (Test-Path $filePath -PathType Leaf) {
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    $mime = "text/html; charset=utf-8"
                    if ($filePath.EndsWith(".css")) { $mime = "text/css" }
                    elseif ($filePath.EndsWith(".js")) { $mime = "application/javascript" }
                    elseif ($filePath.EndsWith(".jpg")) { $mime = "image/jpeg" }
                    
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                } else {
                    $header = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                }
            }
        }
        $client.Close()
    } catch {
        # ignore client disconnects
    }
}
