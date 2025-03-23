document.getElementById("invoice-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const token = document.getElementById("token").value;
    let amount = document.getElementById("amount").value.replace(",", "."); // Soporta decimales con "," o "."
    const description = document.getElementById("description").value;
    let stacksAddress = document.getElementById("stacks-address").value.trim();

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        alert("Enter a valid amount.");
        return;
    }

    // Convertir BNS a dirección Stacks (insensible a mayúsculas)
    if (stacksAddress.endsWith(".btc")) {
        try {
            const response = await fetch(`https://api.hiro.so/v1/names/${stacksAddress.toLowerCase()}`);
            const data = await response.json();
            if (data.address) {
                stacksAddress = data.address;
            } else {
                alert("Invalid BNS name.");
                return;
            }
        } catch (error) {
            alert("Error resolving BNS.");
            return;
        }
    }

    generateInvoice(token, amount, description, stacksAddress);
});

function generateInvoice(token, amount, description, stacksAddress) {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    // Estilos de texto
    ctx.fillStyle = "#000";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";

    // Título
    ctx.font = "bold 24px Arial";
    ctx.fillText("Stacks Invoice", 120, 50);

    // Datos alineados
    ctx.font = "18px Arial";
    ctx.fillText(`Token: ${token}`, 30, 100);
    ctx.fillText(`Amount: ${amount}`, 30, 140);
    ctx.fillText(`Description: ${description}`, 30, 180);

    // Dirección completa, con ajuste de líneas si es muy larga
    const maxWidth = 340;
    const addressLines = breakText(ctx, `Address: ${stacksAddress}`, maxWidth);
    addressLines.forEach((line, index) => {
        ctx.fillText(line, 30, 220 + index * 30);
    });

    // QR centrado
    const qrCanvas = document.createElement("canvas");
    QRCode.toCanvas(qrCanvas, stacksAddress, { width: 200 }, function (error) {
        if (error) console.error(error);
        ctx.drawImage(qrCanvas, 100, 300);
        downloadInvoice(canvas);
    });
}

// Función para dividir texto largo en líneas
function breakText(ctx, text, maxWidth) {
    const words = text.split(" ");
    let lines = [];
    let line = "";
    for (let word of words) {
        let testLine = line + word + " ";
        let testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth) {
            lines.push(line);
            line = word + " ";
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    return lines;
}

// Descargar imagen
function downloadInvoice(canvas) {
    const link = document.createElement("a");
    link.download = "stacks-invoice.png";
    link.href = canvas.toDataURL();
    link.click();
}
