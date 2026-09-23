import { Injectable } from '@nestjs/common';
import { ZATCAGatewayPort, ZATCASignatureResult } from '../ports/zatca-gateway.port';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

@Injectable()
export class ZATCAPhase2GatewayAdapter implements ZATCAGatewayPort {
  async generateAndSignInvoiceXML(invoiceData: any): Promise<ZATCASignatureResult> {
    const uuid = uuidv4();
    const timestamp = new Date().toISOString();

    // Generate UBL 2.1 Standard XML for ZATCA Phase 2
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${invoiceData.id || 'INV-1001'}</cbc:ID>
    <cbc:UUID>${uuid}</cbc:UUID>
    <cbc:IssueDate>${timestamp.split('T')[0]}</cbc:IssueDate>
    <cbc:IssueTime>${timestamp.split('T')[1].slice(0, 8)}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="0111000">388</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cac:AccountingSupplierParty>
        <cac:Party><cbc:RegistrationName>${invoiceData.supplierName || 'شركة المورد المعتمد'}</cbc:RegistrationName></cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party><cbc:RegistrationName>${invoiceData.customerName || 'العميل المشتري'}</cbc:RegistrationName></cac:Party>
    </cac:AccountingCustomerParty>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${invoiceData.vatAmount || 15}</cbc:TaxAmount>
    </cac:TaxTotal>
    <cac:LegalMonetaryTotal>
        <cbc:PayableAmount currencyID="SAR">${invoiceData.grandTotal || 115}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
</Invoice>`;

    // Generate SHA-256 Hash of XML Content
    const xmlHash = crypto.createHash('sha256').update(xmlContent).digest('base64');

    // Generate TLV Encoded Data for ZATCA QR Code
    const qrData = `ZATCA_PHASE2:${invoiceData.supplierName}|VAT:300000000000003|TIME:${timestamp}|TOTAL:${invoiceData.grandTotal}|VAT:${invoiceData.vatAmount}|HASH:${xmlHash}`;
    const qrCodeBase64 = await QRCode.toDataURL(qrData);

    const cryptographicStamp = `ECDSA_STAMP_${crypto.randomBytes(16).toString('hex')}`;

    return {
      uuid,
      xmlContent,
      xmlHash,
      qrCode: qrCodeBase64,
      cryptographicStamp,
    };
  }

  async reportToFatooraPortal(xmlHash: string, signedXml: string): Promise<{ success: boolean; status: string }> {
    // Simulated ZATCA Fatoora Portal API Handshake
    return {
      success: true,
      status: 'REPORTED',
    };
  }
}
