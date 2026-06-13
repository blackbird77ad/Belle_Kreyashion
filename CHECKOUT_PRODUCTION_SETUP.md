# Checkout production setup

## Paystack

1. Set `PAYSTACK_SECRET_KEY` on the backend and `VITE_PAYSTACK_PUBLIC_KEY` on the frontend.
2. In the Paystack dashboard, enable the Ghana payment channels the business accepts, including Mobile Money and cards.
3. Add this webhook URL in Paystack: `https://YOUR_API_HOST/api/orders/paystack/webhook`.
4. Run one live low-value card payment and one Mobile Money payment. Confirm that the Admin `Payments` tab shows `paid`, `completed`, the Paystack channel, committed inventory, and digital access where applicable.
5. Do not put the Paystack secret key in any frontend environment variable.

## Bank transfer

Set `BANK_TRANSFER_BANK_NAME`, `BANK_TRANSFER_ACCOUNT_NAME`, `BANK_TRANSFER_ACCOUNT_NUMBER`, and `BANK_TRANSFER_INSTRUCTIONS`. Bank-transfer orders remain `awaiting-verification` until an admin confirms them in `Admin > Payments`.

## Recovery email and WhatsApp

Email recovery uses the existing Resend or SMTP configuration. Set `ABANDONED_RECOVERY_ENABLED=true` only after email delivery has been tested.

WhatsApp automation requires a Meta WhatsApp Cloud API phone number, permanent access token, and an approved marketing template. Set the `WHATSAPP_CLOUD_*` and `WHATSAPP_RECOVERY_TEMPLATE_*` variables after the template is approved. Leave them blank to use recovery email plus manual WhatsApp follow-up from Admin.

## Tracking

Meta CAPI requires `META_PIXEL_ID` and `META_ACCESS_TOKEN`. Use `META_TEST_EVENT_CODE` during Events Manager testing, then remove the test code for production.

Server GTM requires a deployed server container endpoint in `SERVER_GTM_EVENT_ENDPOINT` and a shared secret in `SERVER_GTM_AUTH_TOKEN`. Verify purchase event IDs in both browser and server streams to confirm deduplication.

Google Enhanced Conversions use the existing normalized and SHA-256 hashed customer fields. Complete the conversion-action labels in the frontend environment and verify them with Tag Assistant and Google Ads diagnostics before increasing campaign spend.

## Release checks

- Test guest checkout for a physical product.
- Test automatic account setup for a digital product.
- Test free digital access and trial card authorization.
- Test coupon limits, date windows, first-time and returning-customer rules.
- Test failed/closed Paystack popups and webhook-only order completion.
- Test bank-transfer confirmation and rejection.
- Test the downloadable paid receipt.
- Test abandoned-cart restoration from email on another browser.
