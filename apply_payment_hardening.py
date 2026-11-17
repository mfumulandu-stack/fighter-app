#!/usr/bin/env python3
# Zahlungen & Anmeldungen robuster machen.
#
# Anlass: Bei Fighter Camp waren 2 von 3 Anmeldungen "nicht bezahlt". Ursache war nicht ein einzelner Fehler,
# sondern dass die App nicht unterscheidet, WARUM jemand unbezahlt ist (wartet auf Freund / Rabatt noch offen /
# Zahlung abgebrochen / Monatsbeitrag) und der Webhook bei verzoegerten Zahlungen "bezahlt" eintragen konnte,
# obwohl noch kein Geld da war.
#
# Was dieses Skript aendert:
#   Server (muss danach deployt werden):
#     - stripe-webhook: traegt NUR bei wirklich eingegangenem Geld (payment_status=paid) ein; versteht verzoegerte
#       Zahlungen (async_payment_succeeded/failed) und abgelaufene Zahlungsseiten (expired); doppelte Zustellung und
#       Doppelzahlung brechen nichts mehr; Push-Nachrichten: Bestaetigung an den Kaeufer, "Dein Freund hat bezahlt"
#       an den wartenden Freund, "Neues Ticket" an den Veranstalter, Erinnerung bei abgebrochener Zahlung.
#       Logik steht jetzt in logic.js und ist mit Tests abgedeckt (index.ts prueft nur noch die Signatur).
#     - create-checkout: Zahlungsseite laeuft nach 2 Stunden ab (statt 24), Stripe zeigt jetzt E-Mail, Name und
#       Beschreibung zur Zahlung an (Dashboard nicht mehr "ohne Kunde").
#     - admin-proxy: Admin darf die Tabelle event_memberships lesen (Monatsmitglieder).
#   App:
#     - Platzanzeige zaehlt nur Bezahlte (wartende "Freund mitbringen"-Eintraege belegten bisher Plaetze)
#     - Admin-Teilnehmerliste mit klarem Status (Bezahlt / Wartet auf Freund / Rabatt frei / Nicht bezahlt)
#       und Monatsmitgliedern; Umsatz beruecksichtigt Rabatte
#     - Nach der Rueckkehr von Stripe wird die Anmeldung wirklich geprueft statt sofort "angemeldet" zu melden
#     - Texte der Event-Karte in allen 4 Sprachen, "BAF" heisst jetzt "👫 −10€", Freund-Ablauf besser erklaert
import base64
import os
import zlib

for need in ('src/App.js', 'src/AdminPanel.js', 'supabase/functions/stripe-webhook/index.ts',
             'supabase/functions/create-checkout/index.ts', 'supabase/functions/admin-proxy/index.ts'):
    assert os.path.exists(need), 'Bitte im Projektordner (fighter-app) ausfuehren - fehlt: ' + need

if os.path.exists('src/eventPayment.js'):
    print('Schon eingespielt (src/eventPayment.js existiert) - nichts zu tun.')
    raise SystemExit(0)

FILES = {
    'supabase/functions/stripe-webhook/logic.js': 'eNrVW19v3MZ2f9enGBOBQcYrSnbvDdp1ZEOW7Ssn8R9YcoM6SCXucnaXFpfckEPJkrJAUOC+3gK9RR+KtulDH/vQxz7ct3wTf4Hej9DfOTNDDrlcW8pNAiRw7CU5c2bmzPnzO+fMbG2J38lyPIvkRJVpPk1ORCxLcaCKZCE3v5SjWZ6flMLPZ5kUD2WWbz6QZZ7FspjJRMksCDe2tvBHfLn78tVTEVXlVKbRVBZqKBI0exuqUpxEWSayqsDnCcjPxYEsTmUhUjzLTFRZLM6iQsTRPFFEK0vGMyWULNUoKkKxn1DbRE6ViNJUlgO0LoXMFOYtk1gq4SWlEm/kPCJKSXGSggARGsmLaJaqgRmiFIuoLEFNYawsGs88sSkwppBJhllh8gr/j2cYFdOaSDWeDZpZfSZ5kBifHmMewq+p6/nWj3G+WEj68biQGHjzZTSKFB7DMAyIUFwV41m5SGQKUsSbsGHVoqiwE8ysLB/PRJxIcZBMs0jhDa2iqCY8mxnWmkq9T49OwQw/IPaGGxvjPMNEH+7+3dHTA7Ej7vxGfCw+2bZ/3d7e3r67QRTe/fN3+NNQ18+/xj+8HM0Kge1LxidKJHOxLyPIqfDUzqcXENZ7g9PbO5+WZrn3vmo93rn3tReyHEdyht2PWSYKcTCepZUsS5luvsxVpJI8E6WSM+zc6y8fPRGntzctA/Eqjookg0xNsIszWRC9s6qIJe8nbWUq1YWSEBUIn5IqFLsVaKPFfCheY45QB1AvhI9xK3UhpnIqMyIji0xW0AixO7KSE6XUcjebFNC3LGDp+FtZTFMJcRSssLujk0oWF1U2DTfk20UOwY/K82wsJlU25rVADZPJueZdvRB/EZ2neRQPBNijuYifclxISHG+gJjuiMtlIC43hNDSVlYjlUq8pq+hefr2WzFN81GUHs6SMhwX5wuVm293655ZfnYgx+j5NFKzcJLmeeH7TAVfxH1hf0K8h+JhpKR+CMQWi3LQUFJ5KosoG9fTqF/wADvYBGjtffFX29sgtdKCCCUT4d8wi6fp36jXr5+YBYHAX1UBAxGlJVaCfthWoZI5DEQ0Xwg9UjMxK2OS+PbV1/RhkmOP9ddFhF3JJyy/2dSvRwzCcpEmyvcGXqBZbekl8VsQon4h243nE9/b8ZgTegnU4FOxHVB7lWSVvOv0PrF9S1hJ6W8PiF4QYvS5H7gNT9sNiegtcbvdkkYDQTDXU17Q4sHpSovT22jSMCNcVOXMP2VKS8v8hgIY7rSFwE/VjOlsdzegFgDi77NqPpKFX9MJ6n3VX8KkfJxkcF2+KoNVStSyEaR7YlvcvKlFMxqVvhHWTQwV4GPdsEckDLPlOeYUnUWJ1ZEwmZMefi7PfeaPV0Rn3oB/ZvJMHMq36lE2ziEAfhBK/uUbudOtLkUWzeVQePtPd/e8ARxBOcPTwf7u5p3ffuKJpW7GM9E/v/KIkd7X9BS0xPLBuWKhbE2QGvuWOhYwWD+x448ua0Yvw48ujeosjwNnHBgeOVYy3pcktrtFEZ2HkyKf+0T2VZKpv+Z3vp1PEPCsw3m08P1RIHbuiRE01ejH7U+CcBHFBwqS6d8ZCG/bsx3e5AkmToqAZ7MhjgiV+Vz6fskEMWsQO4gm8tE3VZT6wBTONGn2y42N2kh2W0cDMdIqSeISWeG8AeEcmYdVySIbESeTCXiwXZsAepnwG/zzqbCk8HTrVqCbf4vtCQHQij1wfFf5SSD+HsO03txtFqyH2OFBlq6f30/SSYklndCS4D5+dZ59LlPGeq+BsuDRyEHDPUb4K/NEJaHbMFfnc0ChIwikqspQPJCJOHj0Ynfzi6gktAhfx+DpptjLAbognGTa92ZyfJJXID3O5wtsiYw9wn0loHEai4goMxh79mRv/xAfiITfHgt76FXZIkpi2LhNgpeMBia6IwPEEh67tCgRnh3uO6vdci1rSfkCRA4AOfAEzed/W64WQ5nXZJvMz7A9HUcgSm18eWpsVPVzlh/ZLoX8pkoKLLot9bIqct8MbWgZ45oRnW14gvxx8lbG/p0gLOQijeAlvBCsI5cFX+GJd//w3x2iMTz4QziTMteEVXFufJsZgowCuXlughG+yMdRKumNMQBeLDcfPsIol+xuXkOYYf4eYbILufVAFmkCcVhqryLGETB8ewDP0w5naZFyTh7RH+XxOZsG/1JoHg7FnW14R/owxGCFHMvkVMZDzLmSjOa5E/GCwNCSB9UkJ1GSElFZFDmgE8QWL7rUf+tSb7U0tFzljaqF0uHZrxKg6xgxlouSFltWi+hVkRKmLE6BLT4nJ8Ph1uPs/oAgIf7Gau9jm9DtZQX9nEINuS9zTzMOfNpsQqc5YWpSOsRwDLb3Dw9fbO5m6gwKFmpDwqoKxkMNY8LTiFJt3JADHMIZlotIKqPw8yglgFxWiDOzdQh6NRCT9PeAV9vGyLxqyAV9Cc2j449rZtRN6jdNK8Mm28Q+trE2v21hbNuefqKt77M0Oni6aQ3G29b0E63pfZ66uAb+H200Cnj18ske7CY5FdVQmTGILVkL3qoiMtKvMc8ecClabx6eL6QH7Y0WgLpjjq623iC9YABRtEiAP4aumPD73UrN8iK54A5DcfxAImAvxEeXTcPlsW5KWsrjGzWlt0tnsQUF9TtkzRVifQKGNFGNoDRrCeSYvVpuUfOt09tbBHXUDINAImkI6mhHsEsf2h/6K2w1/Rual0FnGlH8GRZOWIzFy8dIzDLNscZM2h5vathG2IaYZjF5bek01EpKDa/eBIh93iDy0RFI1zrWverPxCnecmjOC0B1EWUcFIsXRT5J0s0nD0PxDGp2UiQqgXMdCs7HKE6vYDuoD/QU4eiIkI/UlB5Amch7qyJXF5QLmlbwhAkCVNHVrCxXiE39BQ8nnyAcVQkAqtZ9PEB4bGCkAzfb0IKvu2t4tyhc5in/2PQs7yfxjvwGQBaS3YwbLG8i/gc43KkgYEdJfFxz2owb5iftMet9zc9KZyy9yaActJsR3ScxGlL7r7a/JmExP0MzZmtE3b47pB6lT2wtS0uS3RLZjU2KvUh6TVcBdAWdgnPzXjw/ODT6R/+tCHPQfNPO67OD58/Ckp0zbRd7ygQ5iky94mkOzfI62wckEJFBp21kh2fpLoO2fPr1LguyTSG7St9jkZzIWTql/CXlHDPhA94aaQyGgAgGMsggcGR6Y1XS5FtgwfLBuYVdKhrRRA22Ik6vU8NClh1ZQkhEvZf3S3YJR4bIkStaDeFatJL4ZoowQ+3c7kgXqXcjXk084ais35Evsh2BjUru6XBjrb47BNexh2I6x7Vdjx/cpa1Zlkq9eC0YiwK2e4BQN1I5ifzVGGJzLR/iB6kVLHTTfA0/nAaWHQ0Oe6DR+xBpNwpHyJCNLs5C8TRRU2SoY8qkTzifrDgrZ/qtsnRSpTAuTyXh6XKWLKxIDEgREV9G87zKFIUCronT6+pKq8f8PJrXxEqvlt0QBILuEvMTaGlcaZ8rNaBt1M5NAUVpEr9CDolQS43MdTbuFhJpyCfrPDMh9ScHz42+tdJISdaRiN7p2hn2m6HaCF3C+ciJLNBAr2UHkXkCnFbnPdZZpdpoGXs6ZEaHxsjjRWPW9PwaOTRNmxdWjpouzKijijg1dLjWNND7eURR2NDZ3KbBirUYOlvYmEb9a+mk326AwawPbUU0kYTlPDVSAEJ+S5d+rDxdRY5axvrzl08Onxzs7Q/F0xz5mHIEnAAFaWomHGR3tEiH2xzma2264dWx1N2uEUtS3+v0P8kzwExTnXHIiDPKuGddYlrwNUsM9GiEsk9SvD9//8ffdycdIb9yWgvu8UOM21kzpR0oa3GSz+dkIb77o5j+8CfCQGKUlECxJkZuxChYhsf1oM22sDSZocwamo0xadV1lucQRRKpPmx1DNzXBhvSxKzQ8mExicVUBi3ZRg2/3GajaNI0wcMRZZgT4IVolSKm8RiljpjLDUKrjo69368s65SN4CzLJbJIZ4AJCEFAuUnZap3gGTbaBNvfKuMNObREuRK9UdhB0QaVDtQcYyezU1KVJ0S5tBCPE6rSNLRoTjs8JCLOYkrx6qSi8grSTSUJKWhJqq7mXN0xBVibQJqjNtXQimgGANs+VX5OGJpfnBEAF88iynWR2CMWTnNY3SBsI2D2fD2O2t2PttPWfFne5BXgLS9iDYTcPdzb78OQq+YbeSOMjoE5lnOs+Bo73gjFCl7U28cra9nDD2Bxal9T0DSopQOfAkdaSP6axpL28YOG1GXpj7OkvN3bWth0vVxv90hS+VhRiVhRla9XOKcUf8nSJaVNIkmT8C/CByHM71Tq/GqdvawoRIchLCgLUgMaWw93iNGQNierCSNnkuZUD53KmbKCt9Tc6u5Kx0/p7Wt7KvHLsLjXXT3YfbxZJ5yLSZ5OrbN6pFlivBTMPioDCR8u6HFTHUdFVA+xOZmczUGq5ahcSms8lfVVy8Zq3TAi2oUB8PtEpw+AdXh2jVDwL1fjS2F9yNA6l0GDzJyIH8kVxw8s1yi9XmVH6/uV9mpiaAh25bApRswi6oNW6QhDWDMNDJBzkoR1hsWl4Gr8RQWvoGSa1urwCwm1wx1bqED2/zfbf+Nyihf2qNSWol6DtR/Q75LSOdh6hg+y0K9KwTGhsSDo0KZnrVBh/adRmGCou9f+krylzDixq1xj0iZ3UbFZgVZQKrb5pLcvwpmbjpQ7bYDDepyblcC+uNSIYn8yqOMBWwNdrnjB66nNB72eq1o17FthhSSMxb+gFMj7dZwefwmcXKAjkbp7y/1dtpa4zhn26JbZu4fYVCM+dM4L1hMopV0Oc+A5jnnwAaoLLQZhlxpXZdgLWWU0CB95+Lx08BM8GVtqHDNTunqYtYk1Fr/1GiD74fMXLx598Xp3/4tXz343BC7HimEU7IBYC0kr6HmDbtc2Nh22FBelsdru4UNt+bwGLNN7x/55I+YKve2LGldkoEHstTasZm/aHWjX0RwpR3nqBLndbe8PjZr/Wp0HK5+9d//6n//3v//Y3ltvtR3yZxwbsAbSSQcKtr3P+Gyft2S7++67/4BSnoacNVq+++7fGPaSybXS5OM7VS+deGYZoBy8dhuPeyYc5xXyeLZKujLVDheXraeWeWY6LzSZHhPt9u3RoDVC6mCUfnzi4Iu+QHqjI7Rck/QGouUsri2vG9dRhV7RRjFIV+yGNepZa/BamGodnvpw4O9uQQtYwdh42nnRKdERWWP0HsLdGxdorRpZMtPQHQ7COuDY0FJ7Q4EhTgfKhJPWdIJPMZxfmHoJ2I9zIXPGfpuUDsApQtrXalbwgYQsYUUIN66l6eZ4VKKP6DXKzm8CVrCYQs/DIkI2DWrZxMlVlubIFMQvdfBk/cVq4lc3XOOCr+t+R0VeTWfqaFKgjBBf0RGLW45oHN/Mix2KWY/sClAICzlp13ppeweOBfh5fPilcAeu7UDjz1uIVrdjRNvZgo4r11/rvmw+nEimlbtoK0ZHDLVusDbyCGYGGgJfrSTzYwZbLdFYZamTGJKO1NLJb9GUd8LVZJ3rNf/8/R++Z29TkRJRlgXZN4rLOCHXxKuTH/5UaH/SOJN2fg6uAWcbOVum820tnYoxFzZdVLqgirhVLa5l4ESYPXTKRwjn0Vs6b2lO0dhWFHHf3iY01pQenPOhSEbQ8VBXChrm97tkdLFlw0aqwZP/+nfB+UhjqsiXGo/p+IPOkvQKHM26Dx5WlHkAe/hAPJm029t01keYnadj/h2mUpazxGYC+mEEGDO2N8zW8NihPmxTvxJdY1VpK43fb60hWIqRPsHh6LhnTIuTQq01cLnxHli0+oKO/Tml5/dvzRqUhM35p/8RzySOmhuuODtyBUjUg3d6Zdtsd4sTRrhxwmMNJ66cVG4fV7M6QnNvzqyF9Ei1X31cwqljtFLLfN66k0fur2PhgCdyTWSsdU7MUthqOhLko2sbT/XQsj4g1q52OZlieEk7X5NMVjj9n+pzb/roeSvhzjPlSjYfrmty9N6G1ZprVPw2rC5cMVd/d7VQ+cy9kjLk/J65bUMneLt187pKScFaE+szP5tcsr5aUecAoc+STkytnJTS9302NbmILzhwWxJUtE+yizMy4WjopkiAmqKs5xRIlJKvO9/LQR9nDWnxfeVnEqH1u9CTDe4WqjdWsgVOAez+SkKgK5vLm04NcGeKc1W6Xbtq2qmT9pb/G9VcTR/q2jfZoKvV/Btg29RU/iKM1lLSvkTJKl8sSiPA857ldrL4SbxmofSptdI6GeamI96DjdtLcEf9QBRszdn8Jxacbr3ZRcTuVH5mEdMaNF/Ddnz5MNeXvQcrtj6m21ivEaNPZEoX+Sg87dgWSu8hwSU+3lp1PPUJlT7PY8LzZ7nas4e3G0t5gsOhP5sz+umcUJMJ7jN27ZHKkwQJFBrJptEshKvJXVP2f2R0eFWD24+D1h6+sHmidkWJ/Bd5qxzOJHOgkddTXzc37lwHGIof/mUyyTiXLXYXC465rb9yfJibzvPs8fgks9cCVuBRUwAkSdNMoGyEjH86BrRdtQsLrxbKtPuHdEWwXjaLZMEcsddgcUmXkvZ0v1ETLukK2HEPX8xC+3nyi+y+Pl2h4VHv+l1RmEqKAq4uCsfXE4WNLi7lNSdOpN+D0rAXCmkrWmkNwYw6slJpO6L1ET9Y1dwD4/oWyEoztmitpzAfvYEPqO/C1UB9vRETz9FFX6Rl26Hti70iV+v82FyeCa1Jbe7QtA7n9t9raZ2z4Ns2zX0ZoExTW6IrPAGBWF1TGmgfUN9fwdaNJZL+seD8Z+gkJvC/79X3e1pyNGiEjIbMJxO5kqLsv1zTPXzEzFsgmkyoAt9zmM76sXaQ5N57fA8/16zVC95D9loka4Nl6L3Xo9bm7QrD4L4EXyu6IuW6uXN5Scecy43/B8OEbXg=',
    'supabase/functions/stripe-webhook/index.ts': 'eNqVVU1P20AQvftXTH2yq+BwaC9BVALqlhRUohiK2ku0scf2Nptddz8Cgea/d9aOQyqoVCIljnfHb97MezseDiFzDZszg5AWFcInJ3PLlRyBsZo3eHCH81qpRTAcwi3XBayUhOx6Op6kkKWXp9k1MFdWqF2JMoGJdlhaKDjB5bWtkdMNajiRpWYVepQo45Vk1ukYnCzA4Rx1xecUxwykGmmXG2ASaiYLgVlLI12htFEMXIJQFc+TnyYhMI/3UWlLZLHu0tLzFCp4XhMFaQ1deeFkNfKxAG+BFvKFcjYxaAxVmuRq2Qi0WMDe5+ADSKdhjhxux9OLy/HZOUHLCitGPxKX8BlF0WG+4hM1bL0kfjNjqQUGjqFhvIg9tPUNkv9kycxa5rPd4y7PEQviTERXqB8UkgYW4QerhfMMIXpIThPSaHIS/ydoybggxCEkeN9wja8tj6h8dfaB5G7oO3GmJr1KpZccdVuZxxuTfVpJISJ57ni+EBRMj952RjP+PwlpaDWVRePkwsawdMSYimJCIKwIz0P1ZiHvelFqtiAjUCeTIODLxtvi8bmJBr5dvFx3S70XETZQarWEMBn2BguPgiBX0ljIbiYns5vpJcn1EaVKUK6SCm0U+o3Tkyz1m2H85mg/Pkun38Zn6ewi/f7v5/qg6dVlG7kP0h6y2W16en51dUGRZ9P0+jnSS1EtStAGUhtXGLU6Q6TxVwzHH+AxALB63V4BunRkAqFYQQnYHaNTS7GJxXs6dEd7UYZX58j8iT5uI+r2xnRcthPD9D0NY/j9G0LfxyeEFRP8KcuLWkRbLoOndIOX27HlxkuI3rTA8bYmIHYEJUHiHUzRNJQboy/Z1dfEs5QVZY0eAbVWegThjawcCkujA3oWIWziARmoO6gjeHd4SCtdvs1+QehdRQW14A3TZsf/r85pNE7YXeHPhxt27uz5GxrLN1qMduYb9BukKM/xAtejZ0brYnqa/9GCjlUyV8U63su9rXm72932+beSj6g34ZmSllgfXK8bDKmPrGlo8jL/Ahn+NEpSE/cpbYD28hoi6nuvFJ3j94eHo34o0CAXwr8zZD8QwDSMprMmsSQ6Cw8uCV4rcNYudWn/lvX9TtZN4K9/AAFeOZA=',
    'src/eventPayment.js': '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',
    'src/eventPayment.test.js': 'eNq1WNtu4kgQfc9X1BtGIsQwq3lINCsFQmZXm5sSor1ECDV2Aa3Ybba7DUyi/PtUtw34mkC0G+WC2+5Tl646pxweLiKp4fUIoHd+Ob74/aF/+3gzbNH1gknNPb5gQj9opmNlFr0oFloNoxWTfp8tmMf1D7uefu6b+2aBq8s4CAZLTC4XjPvn4eamRFqP8Xa6ubXdxjzNl3iN4QSluoykXfNDLhIXrtgEA7MWK5TJ0hDXmlx7g6mMQmi0Twy2vmM/QvrTODs68iKhtLUyWMI3eAXun0KnBQvJPTyFrtsCTyLTkRybO43b+++NFoRsPc5kQJ3CF3g7S8GmEjED1t2C7YvVNVhHPipP8gk6jVKuaZfThG+/2pPRqLTTeI6URhFEChXYvOaeAcD1Aj3tlKCcVxv8KUxZoBDeWqn7zWZbRz0ybi4bzTMCebO/E3MTfGHz4GAjWsbWRpLvrQ1zWbZBVaRRA4uncCkxFv6nQmrBREbxbK7HU8lR+Enqe4Q1YdNxTCnznjEbf8G3FeOai1m6O/Hyv7YtqBn2NJ1N0D2bMG3rjf+vqak5NZ8r2/DjaIGi7B1yMWXeHGLxyWKpO5FYVNfLHeVBAW0C0/Ww4tIHlM9MiE/X6eumdRtdt+26DbJXXbPmJ9OxdwHTLy8M50EsZjnjG76RWhFDPFl3ClZza+8c1F/1NXxyAkn37Iv1d+2hG6xMoZUB7UOHfRHktioIcJTlFQ7pDQwTIgObRxTUJRJ66b3qA83pjD1eVayeTr6BqxQr2fjUGRX32nArqJDDjn2LTrMgOMTZPPn+UjK2jIgpSPx0C1YoBMxIKWebjMGcBFBUW8sobnVidsFV7nmqaI13rku5M8ulaKjrhE+ZP75max7GIXRIIgNEiXDFVd0p59waZZq06+76syKcfMJJT3DKBfpFT926pu6hlgxnWKG+zA4vYwMELkwC5BNNH5xnIsEkFLEw7NSsI6LN/JNjoBZkcGl8KHOhW5SjfXAaKZXVB74JK5oLzO4FH2U2nNaujcE9KLSy9e6nYqlWzj2wUi7MgXXdfZLyGCoid+o58sZ7Vtybaz7TKUcWS7ZA9+9Ekhh/54FO7oGUeke5OLeTc3WLf6lIS4Z9ttmrGTSO/zDBkFjW9GX2FWHDtrXNVBzlK0RSRCvK2QXT2H4c9ulQu19bliFS1OSpMKujZvBPBO2cAO2sP64YuZcs4D5pneaBlfbu1+NO57jrDl331H7/09jp8A6zdzim28ljGuljkxkGNNWiKFnoV1s4v7kY3A/ua6x0S1ZKuBeVuKZ5DoDMyLSR4lmMAVU+wjXXs4Cj4QY6X4UBiRAMSKOQtE+q6mIpnr8Tbsu1ZU6+2Q7ZwnFCuzNsp6HYEh38G7PAeaIjHpUqVUaTmIpiRjQtUiUZ0Ahdr4slP0q6kLiTMTzKd1FlJElqKzdWNIOZV6tk5dy82x7b19q6NBbefjdzaVsTpDHdj4RmXBj1SobwgvOl/cWXjjLSn6X3so8wC28KZciEYD7E2Uz+ZYAbQ8ObOehDHC6pPPwVU3tCZSvsJtYvKM0uTOYtO+LBklP5PywkvfGUSm0aSXAStlIQTeGpmOQWFFJEC2ms9Mn+HTVTsA3vaaK9wv85HJUGvg3dRvYbW+IVipmepwOl+dJt8mpA3jrO2rqa7li3A/toQuDfDVugHM6ZIFlIN79livgnvZy54Q==',
    'src/stripeWebhook.test.js': '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',
}

# Sicherheitsnetz: nur die erwartete ALTE Webhook-Fassung ersetzen, nie eine eigene neuere ueberschreiben.
old_hook = open('supabase/functions/stripe-webhook/index.ts', encoding='utf-8').read()
assert 'checkout.session.completed' in old_hook and 'verifyStripeSignature' in old_hook and 'handleStripeEvent' not in old_hook, \
    'stripe-webhook/index.ts sieht anders aus als erwartet - bitte melden, nichts wurde geaendert.'


def load(path):
    return open(path, encoding='utf-8').read()


def edit(path, steps):
    s = load(path)
    for kind, a, b, cnt in steps:
        if kind == 'rep':
            n = s.count(a)
            assert n == cnt, '%s: Anker %r erwartet %d, gefunden %d' % (path, a[:80], cnt, n)
            s = s.replace(a, b)
        elif kind == 'line':  # ganze Zeile ersetzen, die das Fragment enthaelt (genau eine)
            lines = s.split('\n')
            hits = [i for i, l in enumerate(lines) if a in l]
            assert len(hits) == 1, '%s: Zeile mit %r erwartet 1, gefunden %d' % (path, a[:80], len(hits))
            lines[hits[0]] = b
            s = '\n'.join(lines)
    return s


# ─────────────────────────────── App.js ───────────────────────────────
app = edit('src/App.js', [
    ('rep',
     "import { isUuid, inviteCodeOf, cleanInviteCode, inviteCodeFilter } from './inviteCode';\n",
     "import { isUuid, inviteCodeOf, cleanInviteCode, inviteCodeFilter } from './inviteCode';\n"
     "import { participantStatus, isFullEvent, capacityCount, paidCount, revenueOf, userStatusTexts } from './eventPayment';\n", 1),

    # Rueckkehr von Stripe: erst merken, dann wirklich pruefen
    ('line', "✅ Zahlung erfolgreich! Du bist jetzt fürs Event angemeldet",
     "        // Die Anmeldung wird vom Server (Stripe-Webhook) erst einige Sekunden NACH der Rueckkehr eingetragen.\n"
     "        // Deshalb hier nur merken - der Effekt \"Zahlung bestaetigen\" (bei joinEventMonthly) prueft, sobald der\n"
     "        // Login da ist, ob die bezahlte Anmeldung wirklich existiert, und meldet dann das Ergebnis.\n"
     "        pendingTicketRef.current={eventId:search.get('event'),membership:search.get('membership')==='1'};\n"
     "        setTimeout(()=>showMsg(L('✅ Zahlung erhalten – deine Anmeldung wird bestätigt …', '✅ Payment received – confirming your registration …', '✅ Paiement reçu – confirmation de ton inscription …', '✅ Pago recibido – confirmando tu inscripción …')),800);", None),
    ('rep', "showMsg('Zahlung abgebrochen - kein Ticket gekauft')",
     "showMsg(L('Zahlung abgebrochen – kein Ticket gekauft', 'Payment cancelled – no ticket bought', 'Paiement annulé – aucun billet acheté', 'Pago cancelado – no se compró ninguna entrada'))", 1),
    ('rep', "  const [myMemberships,setMyMemberships]=useState([]);\n",
     "  const [myMemberships,setMyMemberships]=useState([]);\n  const pendingTicketRef=useRef(null);\n", 1),

    # Zahlung bestaetigen (Effekt vor joinEventMonthly)
    ('rep', "  // Analog zu joinEvent, aber fuer den Monatsbeitrag: eigener Stripe-\n",
     """  // Zahlung bestaetigen: Nach der Rueckkehr von Stripe traegt der Server die Anmeldung erst ein paar
  // Sekunden spaeter ein (Webhook). Statt sofort "angemeldet" zu melden, wird hier nachgesehen, ob die
  // bezahlte Zeile bzw. Mitgliedschaft wirklich da ist (bis zu ~16 Sekunden).
  useEffect(()=>{
    const pending=pendingTicketRef.current;
    if(!pending||!session?.token||!myProfile?.id)return;
    pendingTicketRef.current=null;
    (async()=>{
      for(let i=0;i<8;i++){
        try{
          const token=await getFreshToken();
          const found=pending.membership
            ?await dbSelect('event_memberships','user_id=eq.'+myProfile.id+'&valid_until=gte.'+new Date().toISOString()+'&select=id&limit=1',token)
            :await dbSelect('event_participants','event_id=eq.'+pending.eventId+'&user_id=eq.'+myProfile.id+'&paid=eq.true&select=id&limit=1',token);
          if(Array.isArray(found)&&found.length>0){
            await loadEvents(session);
            showMsg(L('✅ Bezahlt – du bist angemeldet 🎟️', '✅ Paid – you are registered 🎟️', '✅ Payé – tu es inscrit 🎟️', '✅ Pagado – estás inscrito 🎟️'));
            return;
          }
        }catch(e){console.error('Zahlung bestaetigen',e);}
        await new Promise(r=>setTimeout(r,2000));
      }
      loadEvents(session);
      showMsg(L('⏳ Zahlung wird noch bestätigt – du bekommst eine Nachricht, sobald alles gebucht ist.', '⏳ Payment is still being confirmed – you will get a message as soon as it is booked.', '⏳ Paiement en cours de confirmation – tu recevras un message dès que tout est réservé.', '⏳ El pago aún se está confirmando – recibirás un mensaje en cuanto esté reservado.'));
    })();
  },[session?.token,myProfile?.id]);

  // Analog zu joinEvent, aber fuer den Monatsbeitrag: eigener Stripe-
""", 1),

    # Freund mitbringen: klarere Meldung
    ('rep', "showMsg('Angemeldet! Sobald dein Freund auch zahlt, bekommst du 10€ Rabatt.');",
     "showMsg(L('Vorgemerkt! Sobald dein Freund bezahlt hat, bekommst du eine Nachricht und kannst dein Ticket für 10 € weniger kaufen.', 'Noted! As soon as your friend has paid, you get a message and can buy your ticket for €10 less.', 'Noté ! Dès que ton ami a payé, tu reçois un message et tu peux acheter ton billet 10 € moins cher.', '¡Anotado! En cuanto tu amigo haya pagado, recibirás un mensaje y podrás comprar tu entrada por 10 € menos.'));", 1),
    ('line', "Wähle deinen Trainingspartner aus.",
     "            <div style={{color:'#888',fontSize:12,marginBottom:14,lineHeight:1.5}}>{L('Wähle deinen Trainingspartner aus. Sobald er/sie sich auch anmeldet und bezahlt, bekommst du eine Nachricht und kannst dein Ticket für 10 € weniger kaufen.', 'Choose your training partner. As soon as they also register and pay, you get a message and can buy your ticket for €10 less.', 'Choisis ton partenaire d’entraînement. Dès qu’il/elle s’inscrit et paie aussi, tu reçois un message et tu peux acheter ton billet 10 € moins cher.', 'Elige a tu compañero de entrenamiento. En cuanto también se inscriba y pague, recibirás un mensaje y podrás comprar tu entrada por 10 € menos.')}</div>", None),

    # Platzzaehlung: nur Bezahlte
    ('rep', "                  const isFull=parts.length>=(ev.max_participants||10);\n",
     "                  const belegt=capacityCount(parts,ev);\n                  const isFull=isFullEvent(parts,ev);\n", 1),
    ('rep', "{parts.length}/{ev.max_participants||10}{isFull?' · Voll':''}",
     "{belegt}/{ev.max_participants||10}{isFull?L(' · Voll', ' · Full', ' · Complet', ' · Completo'):''}", 1),
    ('rep', "width:Math.min(100,(parts.length/(ev.max_participants||10))*100)+'%'",
     "width:Math.min(100,(belegt/(ev.max_participants||10))*100)+'%'", 1),

    # Einnahmen des Veranstalters (mit Rabatten)
    ('rep', "💰 {parts.filter(p=>p.paid).length} Tickets verkauft</div>",
     "💰 {paidCount(parts)} {L('Tickets verkauft', 'tickets sold', 'billets vendus', 'entradas vendidas')}</div>", 1),
    ('rep', "{(parts.filter(p=>p.paid).length*ev.price).toFixed(2)}€",
     "{revenueOf(parts,ev).toFixed(2)}€", 1),

    # Meine Buchungen: echter Status statt immer "Angemeldet"
    ('rep', "{L('Angemeldet', 'Registered', 'Inscrit', 'Inscrito')}</div>}",
     "{L(...userStatusTexts(participantStatus(mein,ev)))}</div>}", 1),

    # Karte: Texte in allen Sprachen
    ('rep', "Gültig bis {new Date(aktiveMitgliedschaft.valid_until).toLocaleDateString('de')}",
     "{L('Gültig bis', 'Valid until', 'Valable jusqu’au', 'Válida hasta')} {new Date(aktiveMitgliedschaft.valid_until).toLocaleDateString('de')}", 1),
    ('rep', "?.name||'deinem Freund'", "?.name||L('deinen Freund', 'your friend', 'ton ami', 'tu amigo')", 1),
    ('rep', "⏳ Warte auf {mitgebrachterFreundName}",
     "{L('⏳ Warte auf', '⏳ Waiting for', '⏳ En attente de', '⏳ Esperando a')} {mitgebrachterFreundName}", 1),
    ('rep', "✅ Freund hat gezahlt — jetzt für {Math.max(0,ev.price-10)}€ zahlen",
     "{(pr=>L('✅ Freund hat gezahlt — jetzt für '+pr+'€ zahlen', '✅ Friend has paid — pay just €'+pr+' now', '✅ Ton ami a payé — paie seulement '+pr+' € maintenant', '✅ Tu amigo ha pagado — paga solo '+pr+' € ahora'))(Math.max(0,ev.price-10))}", 1),
    ('rep', "{isFull?'Ausgebucht':(ev.price>0?'🎟️ TICKET KAUFEN ('+ev.price+'€)':'🥊 ANMELDEN')}",
     "{isFull?L('Ausgebucht', 'Sold out', 'Complet', 'Agotado'):(ev.price>0?L('🎟️ TICKET KAUFEN (', '🎟️ BUY TICKET (', '🎟️ ACHETER (', '🎟️ COMPRAR (')+ev.price+'€)':L('🥊 ANMELDEN', '🥊 JOIN', '🥊 S’INSCRIRE', '🥊 APUNTARSE'))}", 1),
    ('rep', "                                  BAF\n                                </button>",
     "                                  👫 −10€\n                                </button>", 1),
    ('rep', "📅 Stattdessen Monatsbeitrag ({ev.price_monthly}€ — alle Sessions diesen Monat)",
     "{L('📅 Stattdessen Monatsbeitrag ('+ev.price_monthly+'€ — alle Sessions diesen Monat)', '📅 Monthly pass instead (€'+ev.price_monthly+' — all sessions this month)', '📅 Abonnement mensuel à la place ('+ev.price_monthly+' € — toutes les séances ce mois-ci)', '📅 Cuota mensual en su lugar ('+ev.price_monthly+' € — todas las sesiones este mes)')}", 1),
])

# ───────────────────────────── AdminPanel.js ─────────────────────────────
admin = edit('src/AdminPanel.js', [
    ('rep',
     "import { buildTimeSeries, activeUserCounts, countSince, equipmentRanking, totalEquipmentClicks, eventRevenue, eventParticipationStats, gymStats, rankingActiveCount, DAY_MS } from './adminAnalytics';\n",
     "import { buildTimeSeries, activeUserCounts, countSince, equipmentRanking, totalEquipmentClicks, eventRevenue, eventParticipationStats, gymStats, rankingActiveCount, DAY_MS } from './adminAnalytics';\n"
     "import { participantStatus, adminStatusLabel, capacityCount, paidAmount, revenueOf, paidCount, activeMembersFor } from './eventPayment';\n", 1),

    ('rep', "  const [adminUsersLoaded,setAdminUsersLoaded]=useState(false);\n",
     """  const [adminUsersLoaded,setAdminUsersLoaded]=useState(false);

  // Monatsmitglieder + Namen der mitgebrachten Freunde fuer die Event-Teilnehmerliste.
  // Monatsbeitraege erzeugen KEINE Teilnehmer-Zeile (eigene Tabelle event_memberships) und waren
  // deshalb in der Liste unsichtbar, obwohl das Geld da war.
  const [adminMemberships,setAdminMemberships]=useState([]);
  const [adminNames,setAdminNames]=useState({});
  async function loadPaymentExtras(){
    if(!session?.token)return;
    try{
      const q=(path)=>adminFetch(SUPA_URL+path,{},session.token).then(r=>r.json()).then(d=>Array.isArray(d)?d:[]).catch(()=>[]);
      const ms=await q('/rest/v1/event_memberships?select=*&valid_until=gte.'+encodeURIComponent(new Date().toISOString())+'&order=valid_until.desc&limit=500');
      const ids=new Set(ms.map(m=>m.user_id).filter(Boolean));
      Object.values(eventParticipants||{}).forEach(list=>(list||[]).forEach(p=>{if(p&&p.brought_friend_id)ids.add(p.brought_friend_id);}));
      const names={};
      if(ids.size>0){
        const ps=await q('/rest/v1/profiles?select=id,name&id=in.('+[...ids].join(',')+')');
        ps.forEach(p=>{names[p.id]=p.name;});
      }
      setAdminMemberships(ms);
      setAdminNames(names);
    }catch(e){console.error('loadPaymentExtras',e);}
  }
  useEffect(()=>{
    if(adminTab==='events')loadPaymentExtras();
  },[adminTab,eventParticipants]);
""", 1),

    ('rep',
     "                  const gesamtUmsatz=alleTeilnahmen.reduce((s,p)=>s+(p.paid?(Number(p.amount_paid)||p.eventPrice||0):0),0);\n"
     "                  const offeneZahlungen=alleTeilnahmen.filter(p=>!p.paid&&p.eventPrice>0).length;\n",
     "                  const gesamtUmsatz=alleTeilnahmen.reduce((s,p)=>s+paidAmount(p,{price:p.eventPrice}),0);\n"
     "                  const statusVon=(p)=>participantStatus(p,{price:p.eventPrice});\n"
     "                  const offeneZahlungen=alleTeilnahmen.filter(p=>['unpaid','discount_open'].includes(statusVon(p))).length;\n"
     "                  const wartendAufFreund=alleTeilnahmen.filter(p=>statusVon(p)==='waiting_friend').length;\n", 1),

    ('rep',
     "                          <div style={{color:'#888',fontSize:9}}>OFFEN</div>\n"
     "                        </div>\n"
     "                      )}\n",
     "                          <div style={{color:'#888',fontSize:9}}>OFFEN</div>\n"
     "                        </div>\n"
     "                      )}\n"
     "                      {wartendAufFreund>0&&(\n"
     "                        <div style={{flex:1,background:darkMode?'#2a1f10':'#fff8e8',borderRadius:10,padding:'10px',border:'1px solid #d4a01733',textAlign:'center'}}>\n"
     "                          <div style={{color:'#d4a017',fontSize:18,fontWeight:700,fontFamily:'Rajdhani,sans-serif'}}>{wartendAufFreund}</div>\n"
     "                          <div style={{color:'#888',fontSize:9}}>WARTEN AUF FREUND</div>\n"
     "                        </div>\n"
     "                      )}\n", 1),

    ('rep',
     "👥 {parts.length}/{ev.max_participants||10} Teilnehmer</div>",
     "👥 {capacityCount(parts,ev)}/{ev.max_participants||10} Teilnehmer{(()=>{const n=activeMembersFor(adminMemberships,ev).length;return n>0?' · 📅 '+n+(n>1?' Mitglieder':' Mitglied'):'';})()}</div>", 1),

    ('rep',
     "                                  const bezahltCount=parts.filter(p=>p.paid).length;\n"
     "                                  const summe=parts.reduce((s,p)=>s+(p.paid?(Number(p.amount_paid)||Number(ev.price)||0):0),0);\n",
     "                                  const bezahltCount=paidCount(parts);\n"
     "                                  const summe=revenueOf(parts,ev);\n", 1),

    ('rep',
     "                                    {ev.price>0?(\n"
     "                                      p.paid\n"
     "                                        ?<span style={{fontSize:10,fontWeight:700,color:'#27ae60'}}>✅ {(Number(p.amount_paid)||Number(ev.price)||0).toFixed(2)} €</span>\n"
     "                                        :<span style={{fontSize:10,fontWeight:700,color:'#e74c3c'}}>❌ Nicht bezahlt</span>\n"
     "                                    ):(\n"
     "                                      <span style={{fontSize:10,color:'#888'}}>Kostenlos</span>\n"
     "                                    )}\n"
     "                                  </div>\n"
     "                                ))}\n"
     "                              </div>\n"
     "                            </div>\n"
     "                          )}\n",
     "                                    {(()=>{\n"
     "                                      const st=participantStatus(p,ev);\n"
     "                                      const lb=adminStatusLabel(st);\n"
     "                                      const friend=st==='waiting_friend'&&adminNames[p.brought_friend_id]?' ('+adminNames[p.brought_friend_id]+')':'';\n"
     "                                      return <span style={{fontSize:10,fontWeight:700,color:lb.color}}>{st==='paid'?'✅ '+paidAmount(p,ev).toFixed(2)+' €':lb.text}{friend}</span>;\n"
     "                                    })()}\n"
     "                                  </div>\n"
     "                                ))}\n"
     "                              </div>\n"
     "                            </div>\n"
     "                          )}\n"
     "                          {(()=>{\n"
     "                            const ms=activeMembersFor(adminMemberships,ev);\n"
     "                            if(ms.length===0)return null;\n"
     "                            return(\n"
     "                              <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid '+(darkMode?'#2a2a2a':'#f0f0f0')}}>\n"
     "                                <div style={{color:'#aaa',fontSize:9,letterSpacing:1,marginBottom:6}}>MONATSMITGLIEDER ({ms.length}) — gelten für alle Termine dieses Veranstalters</div>\n"
     "                                <div style={{display:'flex',flexDirection:'column',gap:4}}>\n"
     "                                  {ms.map((m,i)=>(\n"
     "                                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:darkMode?'#2a2a2a':'#f5f5f5',borderRadius:6,padding:'5px 9px'}}>\n"
     "                                      <span style={{fontSize:11,color:darkMode?'#ddd':'#333'}}>{adminNames[m.user_id]||String(m.user_id||'').slice(0,8)+'...'}</span>\n"
     "                                      <span style={{fontSize:10,fontWeight:700,color:'#2980b9'}}>📅 bis {new Date(m.valid_until).toLocaleDateString('de-DE')}{m.amount_paid!=null?' · '+Number(m.amount_paid).toFixed(2)+' €':''}</span>\n"
     "                                    </div>\n"
     "                                  ))}\n"
     "                                </div>\n"
     "                              </div>\n"
     "                            );\n"
     "                          })()}\n", 1),
])

# ─────────────────────────── Edge Functions ───────────────────────────
proxy = edit('supabase/functions/admin-proxy/index.ts', [
    ('rep', '  "/rest/v1/event_participants",\n',
     '  "/rest/v1/event_participants",\n  "/rest/v1/event_memberships",\n', 1),
])

checkout = edit('supabase/functions/create-checkout/index.ts', [
    ('rep', 'const APP_URL = "https://fighterapp.de";\n',
     'const APP_URL = "https://fighterapp.de";\n'
     '// Zahlungsseite laeuft nach 2 Stunden ab (Stripe erlaubt 30 Min bis 24 Std). Bei Ablauf meldet der\n'
     '// Webhook das und schickt eine Erinnerung - bisher stand die Sitzung 24 Stunden offen.\n'
     'const CHECKOUT_TTL_SEC = 2 * 60 * 60;\n', 1),
    ('rep', '      mParams.append("metadata[creator_id]", String(event.creator_id || ""));\n',
     '      mParams.append("metadata[creator_id]", String(event.creator_id || ""));\n'
     '      mParams.append("expires_at", String(Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SEC));\n'
     '      mParams.append("client_reference_id", String(profile.id));\n'
     '      if (user.email) mParams.append("customer_email", user.email);\n'
     '      mParams.append("payment_intent_data[description]", `Monatsbeitrag: ${event.title} - ${profile.name || ""}`);\n'
     '      mParams.append("payment_intent_data[metadata][type]", "membership");\n'
     '      mParams.append("payment_intent_data[metadata][event_id]", String(eventId));\n'
     '      mParams.append("payment_intent_data[metadata][profile_id]", String(profile.id));\n'
     '      mParams.append("payment_intent_data[metadata][user_name]", profile.name || "");\n', 1),
    ('rep', '    if (bafDiscountRow) params.append("metadata[baf_participant_id]", String(bafDiscountRow.id));\n',
     '    if (bafDiscountRow) params.append("metadata[baf_participant_id]", String(bafDiscountRow.id));\n'
     '    params.append("expires_at", String(Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SEC));\n'
     '    params.append("client_reference_id", String(profile.id));\n'
     '    if (user.email) params.append("customer_email", user.email);\n'
     '    // Damit in Stripe sofort erkennbar ist, WER WAS bezahlt hat (sonst nur "pi_...", ohne Kunde).\n'
     '    params.append("payment_intent_data[description]", `Ticket: ${event.title} - ${profile.name || ""}${bafDiscountRow ? " (Freund-Rabatt)" : ""}`);\n'
     '    params.append("payment_intent_data[metadata][event_id]", String(eventId));\n'
     '    params.append("payment_intent_data[metadata][profile_id]", String(profile.id));\n'
     '    params.append("payment_intent_data[metadata][user_name]", profile.name || "");\n', 1),
])

# ───────────────────────────── schreiben ─────────────────────────────
open('src/App.js', 'w', encoding='utf-8').write(app)
open('src/AdminPanel.js', 'w', encoding='utf-8').write(admin)
open('supabase/functions/admin-proxy/index.ts', 'w', encoding='utf-8').write(proxy)
open('supabase/functions/create-checkout/index.ts', 'w', encoding='utf-8').write(checkout)
for path, blob in FILES.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(zlib.decompress(base64.b64decode(blob)).decode('utf-8'))

print('Fertig. Neue Dateien:')
for p in FILES:
    print('  ' + p)
print('Geaendert: src/App.js, src/AdminPanel.js, supabase/functions/{create-checkout,admin-proxy}/index.ts')
