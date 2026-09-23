export interface ZATCASignatureResult {
  uuid: string;
  xmlContent: string;
  xmlHash: string;
  qrCode: string;
  cryptographicStamp: string;
}

export abstract class ZATCAGatewayPort {
  abstract generateAndSignInvoiceXML(invoiceData: any): Promise<ZATCASignatureResult>;
  abstract reportToFatooraPortal(xmlHash: string, signedXml: string): Promise<{ success: boolean; status: string }>;
}
