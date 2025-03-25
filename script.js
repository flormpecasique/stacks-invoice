async function generateInvoice(token, amount, description, stacksAddress, bnsName) {
    const invoiceContainer = document.getElementById("invoice-container");
    invoiceContainer.style.display = "block"; // Mostrar el contenedor
    invoiceContainer.innerHTML = ""; // Limpiar antes de generar una nueva factura

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    // Fondo blanco para la factura
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Estilos de texto
    ctx.fillStyle = "#000";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";

    // Título con margen superior
    ctx.font = "bold 22px Arial";
    ctx.fillText("Stacks Invoice", 120, 50);

    // Datos alineados arriba
    ctx.font = "16px Arial";
    ctx.fillText(`Token: ${token}`, 30, 100);
    ctx.fillText(`Amount: ${amount}`, 30, 140);
    ctx.fillText(`Description:`, 30, 180);
    ctx.fillText(description, 30, 210);

    // Dirección Stacks + BNS en paréntesis
    const fullAddress = bnsName ? `${stacksAddress} (${bnsName})` : stacksAddress;
    const maxWidth = 340;
    const addressLines = breakText(ctx, `Address: ${fullAddress}`, maxWidth);

    // Ajustar posición para evitar que la dirección se superponga con la descripción
    let addressY = 250;
    addressLines.forEach((line, index) => {
        ctx.fillText(line, 30, addressY + index * 20); // Espaciado más compacto
    });

    try {
        // Generar el código QR y dibujarlo en el canvas
        const qrCanvas = await generateQRCode(stacksAddress);
        ctx.drawImage(qrCanvas, 100, 350, 200, 200);

        // Crear la imagen de la factura y mostrarla en pantalla
        const img = new Image();
        img.src = canvas.toDataURL();
        img.style.width = "100%";
        invoiceContainer.appendChild(img);

        // Contenedor de botones alineados
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "buttons-container"; // Usa la clase del CSS

        // Botón Share (antes Pay Now)
        const shareBtn = document.createElement("button");
        shareBtn.textContent = "Share";
        shareBtn.id = "pay-now"; // Mantener el ID para conservar estilos
        shareBtn.onclick = function () {
            shareInvoice(img.src);
        };

        // Botón Descargar imagen
        const downloadBtn = document.createElement("button");
        downloadBtn.textContent = "Download Invoice";
        downloadBtn.id = "download-invoice";
        downloadBtn.onclick = function () {
            const link = document.createElement("a");
            link.download = "stacks-invoice.png";
            link.href = img.src;
            link.click();
        };

        // Agregar botones al contenedor y luego al invoiceContainer
        buttonsContainer.appendChild(shareBtn);
        buttonsContainer.appendChild(downloadBtn);
        invoiceContainer.appendChild(buttonsContainer);

    } catch (error) {
        console.error("Error generating QR code:", error);
        alert("Error generating QR code. Please try again.");
    }
}
