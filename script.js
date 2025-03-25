document.getElementById("invoice-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const token = document.getElementById("token").value;
    let amount = document.getElementById("amount").value.replace(",", "."); // Soporta decimales con "," o "."
    const description = document.getElementById("description").value;
    let stacksAddress = document.getElementById("stacks-address").value.trim();
    let bnsName = ""; // Variable para guardar el BNS si se usa

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
                bnsName = stacksAddress; // Guardar el BNS
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

    generateInvoice(token, amount, description, stacksAddress, bnsName);
});

function generateInvoice(token, amount, description, stacksAddress, bnsName) {
    const invoiceContainer = document.getElementById("invoice-container");
    invoiceContainer.innerHTML = ""; // Limpiar antes de generar

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    // Estilos de texto
    ctx.fillStyle = "#000";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";

    // Título con margen superior
    ctx.font = "bold 24px Arial";
    ctx.fillText("Stacks Invoice", 120, 50);

    // Datos alineados arriba
    ctx.font = "18px Arial";
    ctx.fillText(`Token: ${token}`, 30, 100);
    ctx.fillText(`Amount: ${amount}`, 30, 140);
    ctx.fillText(`Description:`, 30, 180);
    ctx.fillText(description, 30, 210);

    // Dirección Stacks + BNS en paréntesis
    const fullAddress = bnsName ? `${stacksAddress} (${bnsName})` : stacksAddress;
    const maxWidth = 340;
    const addressLines = breakText(ctx, `Address: ${fullAddress}`, maxWidth);
    addressLines.forEach((line, index) => {
        ctx.fillText(line, 30, 250 + index * 30);
    });

    // Generar y agregar QR (solo con la dirección Stacks, sin el BNS)
    QRCode.toCanvas(stacksAddress, { width: 200 }, function (error, qrCanvas) {
        if (error) console.error(error);
        ctx.drawImage(qrCanvas, 100, 350);

        // Mostrar la factura en pantalla
        const img = new Image();
        img.src = canvas.toDataURL();
        img.style.width = "100%";
        invoiceContainer.appendChild(img);

        // Contenedor de botones alineados
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "buttons-container"; // Usa la clase del CSS

        // Botón Pay Now
        const payNowBtn = document.createElement("button");
        payNowBtn.textContent = "Pay Now";
        payNowBtn.id = "pay-now";
        payNowBtn.onclick = function () {
            window.open(`https://wallet.hiro.so/send?recipient=${stacksAddress}&amount=${amount}&token=${token}`, "_blank");
        };

        // Botón Descargar imagen
        const downloadBtn = document.createElement("button");
        downloadBtn.textContent = "Download Invoice";
        downloadBtn.id = "download-invoice";
        downloadBtn.onclick = function () {
            const link = document.createElement("a");
            link.download = "stacks-invoice.png";
            link.href = canvas.toDataURL();
            link.click();
        };

        // Agregar botones al contenedor y luego al invoiceContainer
        buttonsContainer.appendChild(payNowBtn);
        buttonsContainer.appendChild(downloadBtn);
        invoiceContainer.appendChild(buttonsContainer);
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
