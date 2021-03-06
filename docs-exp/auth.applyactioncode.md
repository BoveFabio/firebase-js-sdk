<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@firebase/auth](./auth.md) &gt; [applyActionCode](./auth.applyactioncode.md)

## applyActionCode() function

Applies a verification code sent to the user by email or other out-of-band mechanism.

<b>Signature:</b>

```typescript
export declare function applyActionCode(auth: externs.Auth, oobCode: string): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  auth | externs.[Auth](./auth-types.auth.md) | The Auth instance. |
|  oobCode | string | A verification code sent to the user. |

<b>Returns:</b>

Promise&lt;void&gt;

