# `/proof` — showing the memory behind an answer

Judging criterion one asks whether memory is doing real work. `/proof` answers it
directly: it names the Walrus blobs the last answer actually used, so a judge can
click through from the sentence to the encrypted object on chain.

```
you   › What is my dog called?
hippo › Your dog is called Mochi.

you   › /proof
hippo › My last answer used 2 memories:
        • profile · relevance 0.46
          https://walruscan.com/mainnet/blob/sSON47uP-NTVEGXMuhx_tSCVaQTpSGls2lsYPor5U5k
        • profile · relevance 0.39
          https://walruscan.com/mainnet/blob/SC96pfU-H5EZy-CyYn3Cf30KgFoXXKYDty0-e0F7M7o
```

The fact was taught in an earlier session and the conversation was started fresh,
so "Mochi" could only have come from Walrus.

The `/me` page shows the same blobs with a second link to the raw ciphertext on a
public aggregator, which is the point worth making: anyone can download those
bytes, and only this account can read them.
