param([switch]$Jeu)
$ErrorActionPreference = 'Stop'
$museumRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$museumListener = $null
$museumPort = 8765
foreach ($museumCandidate in 8765..8785) {
    try {
        $museumListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $museumCandidate)
        $museumListener.Start()
        $museumPort = $museumCandidate
        break
    } catch { $museumListener = $null }
}
if (-not $museumListener) { throw 'Aucun port libre entre 8765 et 8785.' }
$museumPage = if ($Jeu) { 'minecraft.html' } else { 'musee.html#minecraft' }
$museumUrl = "http://127.0.0.1:$museumPort/$museumPage"
Write-Host "MUSEE CONTINUE - MINECRAFT" -ForegroundColor Green
Write-Host "Ouvrir : $museumUrl"
Write-Host "Laissez cette fenetre ouverte. Fermez-la pour arreter le serveur."
Start-Process $museumUrl
$museumMime = @{'.html'='text/html; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.json'='application/json';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.webp'='image/webp';'.gif'='image/gif';'.svg'='image/svg+xml';'.woff2'='font/woff2';'.txt'='text/plain; charset=utf-8';'.ico'='image/x-icon'}
try {
    while ($true) {
        $museumClient = $museumListener.AcceptTcpClient()
        try {
            $museumClient.ReceiveTimeout = 3000
            $museumStream = $museumClient.GetStream()
            $museumReader = [System.IO.StreamReader]::new($museumStream, [Text.Encoding]::ASCII, $false, 1024, $true)
            $museumRequest = $museumReader.ReadLine()
            if (-not $museumRequest) { continue }
            do { $museumHeader = $museumReader.ReadLine() } while ($museumHeader)
            $museumPath = [Uri]::UnescapeDataString(($museumRequest.Split(' ')[1].Split('?')[0]))
            if ($museumPath.EndsWith('/')) { $museumPath += 'index.html' }
            $museumFile = [IO.Path]::GetFullPath((Join-Path $museumRoot $museumPath.TrimStart('/').Replace('/', '\')))
            $museumStatus = '200 OK'
            $museumType = $museumMime[[IO.Path]::GetExtension($museumFile).ToLowerInvariant()]
            if (-not $museumType) { $museumType = 'application/octet-stream' }
            if ($museumPath -eq '/assets/tableaux/liste.json') {
                # Liste des images deposees pour les tableaux du musee
                $museumNoms = @(Get-ChildItem -LiteralPath (Join-Path $museumRoot 'assets\tableaux') -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '^\.(jpe?g|png|webp)$' } | ForEach-Object { '"' + $_.Name.Replace('"','').Replace('\','') + '"' })
                $museumType = 'application/json'
                $museumData = [Text.Encoding]::UTF8.GetBytes('[' + ($museumNoms -join ',') + ']')
            } elseif (-not $museumFile.StartsWith($museumRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) {
                $museumStatus = '403 Forbidden'; $museumData = [Text.Encoding]::UTF8.GetBytes('Forbidden')
            } elseif (-not [IO.File]::Exists($museumFile)) {
                $museumStatus = '404 Not Found'; $museumData = [Text.Encoding]::UTF8.GetBytes('Not found')
            } else { $museumData = [IO.File]::ReadAllBytes($museumFile) }
            $museumResponse = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $museumStatus`r`nContent-Type: $museumType`r`nContent-Length: $($museumData.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n")
            $museumStream.Write($museumResponse,0,$museumResponse.Length)
            $museumStream.Write($museumData,0,$museumData.Length)
        } catch {} finally { $museumClient.Dispose() }
    }
} finally { $museumListener.Stop() }
