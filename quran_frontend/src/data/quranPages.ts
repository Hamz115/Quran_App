// Madani Mushaf Page Mapping
// Each entry represents the first ayah of each page: [surahNumber, ayahNumber]
// Page 1 starts at Al-Fatiha 1:1, Page 604 ends at An-Nas 114:6

// pageStarts[pageNumber - 1] = [surahNumber, ayahNumber] of first ayah on that page
export const pageStarts: [number, number][] = [
  [1, 1],   // Page 1: Al-Fatiha 1:1
  [2, 1],   // Page 2: Al-Baqarah 2:1
  [2, 6],   // Page 3
  [2, 17],  // Page 4
  [2, 25],  // Page 5
  [2, 30],  // Page 6
  [2, 38],  // Page 7
  [2, 49],  // Page 8
  [2, 58],  // Page 9
  [2, 62],  // Page 10
  [2, 70],  // Page 11
  [2, 77],  // Page 12
  [2, 84],  // Page 13
  [2, 89],  // Page 14
  [2, 94],  // Page 15
  [2, 102], // Page 16
  [2, 106], // Page 17
  [2, 113], // Page 18
  [2, 120], // Page 19
  [2, 127], // Page 20
  [2, 135], // Page 21
  [2, 142], // Page 22
  [2, 146], // Page 23
  [2, 154], // Page 24
  [2, 164], // Page 25
  [2, 170], // Page 26
  [2, 177], // Page 27
  [2, 182], // Page 28
  [2, 187], // Page 29
  [2, 191], // Page 30
  [2, 197], // Page 31
  [2, 203], // Page 32
  [2, 211], // Page 33
  [2, 216], // Page 34
  [2, 220], // Page 35
  [2, 225], // Page 36
  [2, 231], // Page 37
  [2, 234], // Page 38
  [2, 238], // Page 39
  [2, 246], // Page 40
  [2, 249], // Page 41
  [2, 253], // Page 42
  [2, 257], // Page 43
  [2, 260], // Page 44
  [2, 265], // Page 45
  [2, 270], // Page 46
  [2, 275], // Page 47
  [2, 282], // Page 48
  [2, 283], // Page 49
  [3, 1],   // Page 50: Al-Imran starts
  [3, 10],  // Page 51
  [3, 16],  // Page 52
  [3, 23],  // Page 53
  [3, 30],  // Page 54
  [3, 38],  // Page 55
  [3, 46],  // Page 56
  [3, 53],  // Page 57
  [3, 62],  // Page 58
  [3, 71],  // Page 59
  [3, 78],  // Page 60
  [3, 84],  // Page 61
  [3, 92],  // Page 62
  [3, 101], // Page 63
  [3, 109], // Page 64
  [3, 116], // Page 65
  [3, 122], // Page 66
  [3, 133], // Page 67
  [3, 141], // Page 68
  [3, 149], // Page 69
  [3, 154], // Page 70
  [3, 158], // Page 71
  [3, 166], // Page 72
  [3, 174], // Page 73
  [3, 181], // Page 74
  [3, 187], // Page 75
  [3, 195], // Page 76
  [4, 1],   // Page 77: An-Nisa starts
  [4, 7],   // Page 78
  [4, 12],  // Page 79
  [4, 15],  // Page 80
  [4, 20],  // Page 81
  [4, 24],  // Page 82
  [4, 27],  // Page 83
  [4, 34],  // Page 84
  [4, 38],  // Page 85
  [4, 45],  // Page 86
  [4, 52],  // Page 87
  [4, 60],  // Page 88
  [4, 66],  // Page 89
  [4, 75],  // Page 90
  [4, 80],  // Page 91
  [4, 87],  // Page 92
  [4, 92],  // Page 93
  [4, 95],  // Page 94
  [4, 102], // Page 95
  [4, 106], // Page 96
  [4, 114], // Page 97
  [4, 122], // Page 98
  [4, 128], // Page 99
  [4, 135], // Page 100
  [4, 141], // Page 101
  [4, 148], // Page 102
  [4, 155], // Page 103
  [4, 163], // Page 104
  [4, 171], // Page 105
  [4, 176], // Page 106
  [5, 3],   // Page 107: Al-Ma'idah (starts at 5:1 but page 107 is 5:3)
  [5, 6],   // Page 108
  [5, 10],  // Page 109
  [5, 14],  // Page 110
  [5, 18],  // Page 111
  [5, 24],  // Page 112
  [5, 32],  // Page 113
  [5, 37],  // Page 114
  [5, 42],  // Page 115
  [5, 46],  // Page 116
  [5, 51],  // Page 117
  [5, 58],  // Page 118
  [5, 65],  // Page 119
  [5, 71],  // Page 120
  [5, 77],  // Page 121
  [5, 83],  // Page 122
  [5, 90],  // Page 123
  [5, 96],  // Page 124
  [5, 104], // Page 125
  [5, 109], // Page 126
  [5, 114], // Page 127
  [6, 1],   // Page 128: Al-An'am starts
  [6, 9],   // Page 129
  [6, 19],  // Page 130
  [6, 28],  // Page 131
  [6, 36],  // Page 132
  [6, 45],  // Page 133
  [6, 53],  // Page 134
  [6, 60],  // Page 135
  [6, 69],  // Page 136
  [6, 74],  // Page 137
  [6, 82],  // Page 138
  [6, 91],  // Page 139
  [6, 95],  // Page 140
  [6, 102], // Page 141
  [6, 111], // Page 142
  [6, 119], // Page 143
  [6, 125], // Page 144
  [6, 132], // Page 145
  [6, 138], // Page 146
  [6, 143], // Page 147
  [6, 147], // Page 148
  [6, 152], // Page 149
  [6, 158], // Page 150
  [7, 1],   // Page 151: Al-A'raf starts
  [7, 12],  // Page 152
  [7, 23],  // Page 153
  [7, 31],  // Page 154
  [7, 38],  // Page 155
  [7, 44],  // Page 156
  [7, 52],  // Page 157
  [7, 58],  // Page 158
  [7, 68],  // Page 159
  [7, 74],  // Page 160
  [7, 82],  // Page 161
  [7, 88],  // Page 162
  [7, 96],  // Page 163
  [7, 105], // Page 164
  [7, 121], // Page 165
  [7, 131], // Page 166
  [7, 138], // Page 167
  [7, 144], // Page 168
  [7, 150], // Page 169
  [7, 156], // Page 170
  [7, 160], // Page 171
  [7, 164], // Page 172
  [7, 171], // Page 173
  [7, 179], // Page 174
  [7, 188], // Page 175
  [7, 196], // Page 176
  [8, 1],   // Page 177: Al-Anfal starts
  [8, 9],   // Page 178
  [8, 17],  // Page 179
  [8, 26],  // Page 180
  [8, 34],  // Page 181
  [8, 41],  // Page 182
  [8, 46],  // Page 183
  [8, 53],  // Page 184
  [8, 62],  // Page 185
  [8, 70],  // Page 186
  [9, 1],   // Page 187: At-Tawbah starts
  [9, 7],   // Page 188
  [9, 14],  // Page 189
  [9, 21],  // Page 190
  [9, 27],  // Page 191
  [9, 32],  // Page 192
  [9, 37],  // Page 193
  [9, 41],  // Page 194
  [9, 48],  // Page 195
  [9, 55],  // Page 196
  [9, 62],  // Page 197
  [9, 69],  // Page 198
  [9, 73],  // Page 199
  [9, 80],  // Page 200
  [9, 87],  // Page 201
  [9, 94],  // Page 202
  [9, 100], // Page 203
  [9, 107], // Page 204
  [9, 112], // Page 205
  [9, 118], // Page 206
  [9, 123], // Page 207
  [10, 1],  // Page 208: Yunus starts
  [10, 7],  // Page 209
  [10, 15], // Page 210
  [10, 21], // Page 211
  [10, 26], // Page 212
  [10, 34], // Page 213
  [10, 43], // Page 214
  [10, 54], // Page 215
  [10, 62], // Page 216
  [10, 71], // Page 217
  [10, 79], // Page 218
  [10, 89], // Page 219
  [10, 98], // Page 220
  [10, 107], // Page 221
  [11, 6],  // Page 222: Hud
  [11, 13], // Page 223
  [11, 20], // Page 224
  [11, 29], // Page 225
  [11, 38], // Page 226
  [11, 46], // Page 227
  [11, 54], // Page 228
  [11, 63], // Page 229
  [11, 72], // Page 230
  [11, 82], // Page 231
  [11, 89], // Page 232
  [11, 98], // Page 233
  [11, 109], // Page 234
  [11, 118], // Page 235
  [12, 5],  // Page 236: Yusuf
  [12, 15], // Page 237
  [12, 23], // Page 238
  [12, 31], // Page 239
  [12, 38], // Page 240
  [12, 44], // Page 241
  [12, 53], // Page 242
  [12, 64], // Page 243
  [12, 70], // Page 244
  [12, 79], // Page 245
  [12, 87], // Page 246
  [12, 96], // Page 247
  [12, 104], // Page 248
  [13, 1],  // Page 249: Ar-Ra'd
  [13, 6],  // Page 250
  [13, 14], // Page 251
  [13, 19], // Page 252
  [13, 29], // Page 253
  [13, 35], // Page 254
  [13, 43], // Page 255
  [14, 6],  // Page 256: Ibrahim
  [14, 11], // Page 257
  [14, 19], // Page 258
  [14, 25], // Page 259
  [14, 34], // Page 260
  [14, 43], // Page 261
  [15, 1],  // Page 262: Al-Hijr
  [15, 16], // Page 263
  [15, 32], // Page 264
  [15, 52], // Page 265
  [15, 71], // Page 266
  [15, 91], // Page 267
  [16, 7],  // Page 268: An-Nahl
  [16, 15], // Page 269
  [16, 27], // Page 270
  [16, 35], // Page 271
  [16, 43], // Page 272
  [16, 55], // Page 273
  [16, 65], // Page 274
  [16, 73], // Page 275
  [16, 80], // Page 276
  [16, 88], // Page 277
  [16, 94], // Page 278
  [16, 103], // Page 279
  [16, 111], // Page 280
  [16, 119], // Page 281
  [17, 1],  // Page 282: Al-Isra
  [17, 8],  // Page 283
  [17, 18], // Page 284
  [17, 28], // Page 285
  [17, 39], // Page 286
  [17, 50], // Page 287
  [17, 59], // Page 288
  [17, 67], // Page 289
  [17, 76], // Page 290
  [17, 87], // Page 291
  [17, 97], // Page 292
  [17, 105], // Page 293
  [18, 5],  // Page 294: Al-Kahf
  [18, 16], // Page 295
  [18, 21], // Page 296
  [18, 28], // Page 297
  [18, 35], // Page 298
  [18, 46], // Page 299
  [18, 54], // Page 300
  [18, 62], // Page 301
  [18, 75], // Page 302
  [18, 84], // Page 303
  [18, 98], // Page 304
  [19, 1],  // Page 305: Maryam
  [19, 12], // Page 306
  [19, 26], // Page 307
  [19, 39], // Page 308
  [19, 52], // Page 309
  [19, 65], // Page 310
  [19, 77], // Page 311
  [19, 96], // Page 312
  [20, 13], // Page 313: Ta-Ha
  [20, 38], // Page 314
  [20, 52], // Page 315
  [20, 65], // Page 316
  [20, 77], // Page 317
  [20, 88], // Page 318
  [20, 99], // Page 319
  [20, 114], // Page 320
  [20, 126], // Page 321
  [21, 1],  // Page 322: Al-Anbiya
  [21, 11], // Page 323
  [21, 25], // Page 324
  [21, 36], // Page 325
  [21, 45], // Page 326
  [21, 58], // Page 327
  [21, 73], // Page 328
  [21, 82], // Page 329
  [21, 91], // Page 330
  [21, 102], // Page 331
  [22, 1],  // Page 332: Al-Hajj
  [22, 6],  // Page 333
  [22, 16], // Page 334
  [22, 24], // Page 335
  [22, 31], // Page 336
  [22, 39], // Page 337
  [22, 47], // Page 338
  [22, 56], // Page 339
  [22, 65], // Page 340
  [22, 73], // Page 341
  [23, 1],  // Page 342: Al-Mu'minun
  [23, 18], // Page 343
  [23, 28], // Page 344
  [23, 43], // Page 345
  [23, 60], // Page 346
  [23, 75], // Page 347
  [23, 90], // Page 348
  [23, 105], // Page 349
  [24, 1],  // Page 350: An-Nur
  [24, 11], // Page 351
  [24, 21], // Page 352
  [24, 28], // Page 353
  [24, 32], // Page 354
  [24, 37], // Page 355
  [24, 44], // Page 356
  [24, 54], // Page 357
  [24, 59], // Page 358
  [24, 62], // Page 359
  [25, 3],  // Page 360: Al-Furqan
  [25, 12], // Page 361
  [25, 21], // Page 362
  [25, 33], // Page 363
  [25, 44], // Page 364
  [25, 56], // Page 365
  [25, 68], // Page 366
  [26, 1],  // Page 367: Ash-Shu'ara
  [26, 20], // Page 368
  [26, 40], // Page 369
  [26, 61], // Page 370
  [26, 84], // Page 371
  [26, 112], // Page 372
  [26, 137], // Page 373
  [26, 160], // Page 374
  [26, 184], // Page 375
  [26, 207], // Page 376
  [27, 1],  // Page 377: An-Naml
  [27, 14], // Page 378
  [27, 23], // Page 379
  [27, 36], // Page 380
  [27, 45], // Page 381
  [27, 56], // Page 382
  [27, 64], // Page 383
  [27, 77], // Page 384
  [27, 89], // Page 385
  [28, 6],  // Page 386: Al-Qasas
  [28, 14], // Page 387
  [28, 22], // Page 388
  [28, 29], // Page 389
  [28, 36], // Page 390
  [28, 44], // Page 391
  [28, 51], // Page 392
  [28, 60], // Page 393
  [28, 71], // Page 394
  [28, 78], // Page 395
  [28, 85], // Page 396
  [29, 7],  // Page 397: Al-Ankabut
  [29, 15], // Page 398
  [29, 24], // Page 399
  [29, 31], // Page 400
  [29, 39], // Page 401
  [29, 46], // Page 402
  [29, 53], // Page 403
  [29, 64], // Page 404
  [30, 6],  // Page 405: Ar-Rum
  [30, 16], // Page 406
  [30, 25], // Page 407
  [30, 33], // Page 408
  [30, 42], // Page 409
  [30, 51], // Page 410
  [31, 1],  // Page 411: Luqman
  [31, 12], // Page 412
  [31, 21], // Page 413
  [31, 29], // Page 414
  [32, 1],  // Page 415: As-Sajdah
  [32, 12], // Page 416
  [32, 21], // Page 417
  [33, 1],  // Page 418: Al-Ahzab
  [33, 7],  // Page 419
  [33, 15], // Page 420
  [33, 23], // Page 421
  [33, 31], // Page 422
  [33, 36], // Page 423
  [33, 44], // Page 424
  [33, 51], // Page 425
  [33, 55], // Page 426
  [33, 63], // Page 427
  [34, 1],  // Page 428: Saba
  [34, 8],  // Page 429
  [34, 15], // Page 430
  [34, 23], // Page 431
  [34, 32], // Page 432
  [34, 40], // Page 433
  [34, 49], // Page 434
  [35, 4],  // Page 435: Fatir
  [35, 12], // Page 436
  [35, 19], // Page 437
  [35, 31], // Page 438
  [35, 39], // Page 439
  [35, 45], // Page 440
  [36, 13], // Page 441: Ya-Sin
  [36, 28], // Page 442
  [36, 41], // Page 443
  [36, 55], // Page 444
  [36, 71], // Page 445
  [37, 1],  // Page 446: As-Saffat
  [37, 25], // Page 447
  [37, 52], // Page 448
  [37, 77], // Page 449
  [37, 103], // Page 450
  [37, 127], // Page 451
  [37, 154], // Page 452
  [38, 1],  // Page 453: Sad
  [38, 17], // Page 454
  [38, 27], // Page 455
  [38, 43], // Page 456
  [38, 62], // Page 457
  [38, 84], // Page 458
  [39, 6],  // Page 459: Az-Zumar
  [39, 11], // Page 460
  [39, 22], // Page 461
  [39, 32], // Page 462
  [39, 41], // Page 463
  [39, 48], // Page 464
  [39, 57], // Page 465
  [39, 67], // Page 466: Zumar continues (ends at ayah 74)
  [39, 75], // Page 467: Zumar ayah 75 (last), then Ghafir (40) starts
  [40, 8],  // Page 468: Ghafir continues
  [40, 17], // Page 469
  [40, 25], // Page 470
  [40, 33], // Page 471
  [40, 41], // Page 472
  [40, 50], // Page 473
  [40, 59], // Page 474
  [40, 67], // Page 475
  [40, 77], // Page 476
  [41, 1],  // Page 477: Fussilat starts
  [41, 9],  // Page 478
  [41, 18], // Page 479
  [41, 25], // Page 480
  [41, 33], // Page 481
  [41, 40], // Page 482
  [41, 47], // Page 483
  [42, 1],  // Page 484: Ash-Shuraa
  [42, 11], // Page 485
  [42, 16], // Page 486
  [42, 23], // Page 487
  [42, 32], // Page 488
  [42, 45], // Page 489
  [42, 52], // Page 490
  [43, 11], // Page 491: Az-Zukhruf
  [43, 23], // Page 492
  [43, 34], // Page 493
  [43, 48], // Page 494
  [43, 61], // Page 495
  [43, 74], // Page 496
  [44, 1],  // Page 497: Ad-Dukhan
  [44, 19], // Page 498
  [44, 40], // Page 499
  [45, 1],  // Page 500: Al-Jathiyah
  [45, 14], // Page 501
  [45, 23], // Page 502
  [45, 33], // Page 503
  [46, 6],  // Page 504: Al-Ahqaf
  [46, 15], // Page 505
  [46, 21], // Page 506
  [46, 29], // Page 507
  [47, 1],  // Page 508: Muhammad
  [47, 12], // Page 509
  [47, 20], // Page 510
  [47, 30], // Page 511
  [48, 1],  // Page 512: Al-Fath
  [48, 10], // Page 513
  [48, 16], // Page 514
  [48, 24], // Page 515
  [49, 1],  // Page 516: Al-Hujurat
  [49, 11], // Page 517
  [50, 1],  // Page 518: Qaf
  [50, 16], // Page 519
  [50, 36], // Page 520
  [51, 7],  // Page 521: Adh-Dhariyat
  [51, 31], // Page 522
  [51, 52], // Page 523
  [52, 15], // Page 524: At-Tur
  [52, 32], // Page 525
  [53, 1],  // Page 526: An-Najm
  [53, 27], // Page 527
  [53, 45], // Page 528
  [54, 7],  // Page 529: Al-Qamar
  [54, 28], // Page 530
  [54, 50], // Page 531
  [55, 17], // Page 532: Ar-Rahman
  [55, 41], // Page 533
  [55, 68], // Page 534
  [56, 17], // Page 535: Al-Waqi'ah
  [56, 51], // Page 536
  [56, 77], // Page 537
  [57, 4],  // Page 538: Al-Hadid
  [57, 13], // Page 539
  [57, 22], // Page 540
  [58, 1],  // Page 541: Al-Mujadila
  [58, 7],  // Page 542
  [58, 12], // Page 543
  [58, 22], // Page 544
  [59, 4],  // Page 545: Al-Hashr
  [59, 10], // Page 546
  [59, 17], // Page 547
  [60, 1],  // Page 548: Al-Mumtahanah
  [60, 7],  // Page 549
  [61, 1],  // Page 550: As-Saff
  [61, 11], // Page 551
  [62, 6],  // Page 552: Al-Jumu'ah
  [63, 5],  // Page 553: Al-Munafiqun
  [64, 5],  // Page 554: At-Taghabun
  [64, 14], // Page 555
  [65, 1],  // Page 556: At-Talaq
  [65, 6],  // Page 557
  [66, 1],  // Page 558: At-Tahrim
  [66, 8],  // Page 559
  [67, 1],  // Page 560: Al-Mulk
  [67, 13], // Page 561
  [67, 27], // Page 562
  [68, 16], // Page 563: Al-Qalam
  [68, 43], // Page 564
  [69, 9],  // Page 565: Al-Haqqah
  [69, 35], // Page 566
  [70, 11], // Page 567: Al-Ma'arij
  [70, 40], // Page 568
  [71, 11], // Page 569: Nuh
  [72, 1],  // Page 570: Al-Jinn
  [72, 14], // Page 571
  [73, 1],  // Page 572: Al-Muzzammil
  [73, 20], // Page 573
  [74, 18], // Page 574: Al-Muddaththir
  [74, 48], // Page 575
  [75, 20], // Page 576: Al-Qiyamah
  [76, 6],  // Page 577: Al-Insan
  [76, 26], // Page 578
  [77, 20], // Page 579: Al-Mursalat
  [78, 1],  // Page 580: An-Naba
  [78, 31], // Page 581
  [79, 16], // Page 582: An-Nazi'at
  [79, 46], // Page 583
  [80, 23], // Page 584: Abasa
  [81, 15], // Page 585: At-Takwir
  [82, 7],  // Page 586: Al-Infitar
  [83, 7],  // Page 587: Al-Mutaffifin
  [83, 35], // Page 588
  [84, 10], // Page 589: Al-Inshiqaq
  [85, 11], // Page 590: Al-Buruj
  [86, 11], // Page 591: At-Tariq, Al-A'la starts mid-page
  [87, 14], // Page 592: Al-A'la continues, Al-Ghashiyah (entire surah)
  [89, 1],  // Page 593: Al-Fajr starts
  [89, 16], // Page 594: Al-Fajr continues, Al-Balad (complete)
  [91, 1],  // Page 595: Ash-Shams, Al-Layl starts
  [92, 12], // Page 596: Al-Layl continues, Ad-Duha, Ash-Sharh starts
  [94, 6],  // Page 597: Ash-Sharh continues, At-Tin, Al-Alaq starts
  [96, 11], // Page 598: Al-Alaq continues, Al-Qadr, Al-Bayyinah starts
  [98, 6],  // Page 599: Al-Bayyinah continues, Az-Zalzalah, Al-Adiyat starts
  [100, 9], // Page 600: Al-Adiyat continues, Al-Qari'ah, At-Takathur (ends this page)
  [103, 1], // Page 601: Al-Asr, Al-Humazah, Al-Fil, Quraysh starts
  [106, 1], // Page 602: Quraysh, Al-Ma'un, Al-Kawthar
  [109, 1], // Page 603: Al-Kafirun, An-Nasr, Al-Masad
  [112, 1], // Page 604: Al-Ikhlas, Al-Falaq, An-Nas
];

// Get the page number for a given surah and ayah
export function getPageNumber(surahNumber: number, ayahNumber: number): number {
  // Search backwards from the end to find the correct page
  for (let i = pageStarts.length - 1; i >= 0; i--) {
    const [surah, ayah] = pageStarts[i];
    if (surahNumber > surah || (surahNumber === surah && ayahNumber >= ayah)) {
      return i + 1; // Pages are 1-indexed
    }
  }
  return 1;
}

// Get the ayah range for a given page
export function getPageRange(pageNumber: number): { startSurah: number; startAyah: number; endSurah: number; endAyah: number } {
  if (pageNumber < 1 || pageNumber > 604) {
    throw new Error('Invalid page number');
  }

  const [startSurah, startAyah] = pageStarts[pageNumber - 1];

  if (pageNumber === 604) {
    // Last page ends at An-Nas 114:6
    return { startSurah, startAyah, endSurah: 114, endAyah: 6 };
  }

  const [nextSurah, nextAyah] = pageStarts[pageNumber];

  // End is one ayah before the next page starts
  if (nextAyah === 1) {
    // Next page starts a new surah, so this page ends at the last ayah of the previous surah
    // We need to know the number of ayahs in each surah for this
    // For simplicity, return the start of next page and let caller figure it out
    return { startSurah, startAyah, endSurah: nextSurah - 1, endAyah: 999 }; // 999 means "last ayah"
  }

  return { startSurah, startAyah, endSurah: nextSurah, endAyah: nextAyah - 1 };
}

// Total pages in Madani Mushaf
export const TOTAL_PAGES = 604;

// Get all surahs that appear on a given page
export function getSurahsOnPage(pageNumber: number): number[] {
  const range = getPageRange(pageNumber);
  const surahs: number[] = [];
  for (let s = range.startSurah; s <= range.endSurah; s++) {
    surahs.push(s);
  }
  return surahs;
}
