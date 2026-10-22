/*
 * WRI Aqueduct 4.0 baseline water stress, total gross withdrawal weighting.
 * Publisher dataset: Aqueduct40_rankings_download_Y2023M07D05.xlsx
 * Publisher XLSX SHA-256: 74a12845306c7a84711485cf97f067affb379a83894428bb1d42171eaa51a13a
 * Baseline quantity indicators use historical data from 1979–2019; this is
 * screening data, not real-time data.
 * Source: https://files.wri.org/aqueduct/aqueduct-4-0-country-rankings.zip
 * Methodology: https://github.com/wri/Aqueduct40/blob/master/data_dictionary_country-rankings.md
 * License: CC BY 4.0. Values are copied without recalculation and rounded only
 * to the publisher's displayed precision. NoData rows are intentionally omitted.
 */
window.WATA_WATER_STRESS=Object.freeze({
  edition:'Aqueduct 4.0',period:'1979–2019',weight:'Total gross withdrawal',
  source:'World Resources Institute',license:'CC BY 4.0',
  countries:Object.freeze({
    AFG:[3.36919,3],AGO:[1.13079,1],ALB:[3.47383,3],AND:[3.545,3],ARE:[4.99999,4],ARG:[1.83492,1],ARM:[2.99159,2],AUS:[2.90672,2],AUT:[.2615,0],AZE:[2.46835,2],
    BDI:[0,0],BEL:[4.41084,4],BEN:[.00343,0],BFA:[1.64604,1],BGD:[2.66056,2],BGR:[1.45732,1],BHR:[5,4],BIH:[.39589,0],BLR:[1.18097,1],BLZ:[.0682,0],BOL:[.15553,0],BRA:[1.03791,1],BRN:[0,0],BTN:[.36778,0],BWA:[4.66431,4],
    CAF:[.01013,0],CAN:[1.23332,1],CHE:[.40562,0],CHL:[4.47187,4],CHN:[2.80026,2],CIV:[0,0],CMR:[.00813,0],COD:[.01216,0],COG:[.01441,0],COL:[.49614,0],CRI:[.64823,0],CUB:[1.65092,1],CYP:[5,4],CZE:[1.83597,1],
    DEU:[2.0419,2],DJI:[3.17552,3],DNK:[.95142,0],DOM:[1.60448,1],DZA:[3.874,3],ECU:[.65732,0],EGY:[4.85163,4],ERI:[3.94254,3],ESP:[3.94024,3],EST:[1.21806,1],ETH:[.96124,0],FIN:[.80863,0],FRA:[1.91645,1],
    GAB:[0,0],GBR:[1.298,1],GEO:[.92815,0],GHA:[.1124,0],GIN:[.35508,0],GMB:[.02451,0],GNB:[.30749,0],GNQ:[0,0],GRC:[4.3389,4],GTM:[1.02666,1],GUY:[2.69573,2],HND:[.11262,0],HRV:[.16765,0],HTI:[1.60258,1],HUN:[.42517,0],
    IDN:[2.66916,2],IND:[4.10779,4],IRL:[.36334,0],IRN:[4.65337,4],IRQ:[4.14623,4],ISL:[0,0],ISR:[4.94165,4],ITA:[3.34402,3],JAM:[0,0],JOR:[4.61958,4],JPN:[1.96775,1],KAZ:[2.51156,2],KEN:[.78821,0],KGZ:[3.27685,3],KHM:[1.87051,1],KOR:[2.38125,2],KWT:[5,4],
    LAO:[.74162,0],LBN:[5,4],LBR:[0,0],LBY:[4.80521,4],LIE:[.81313,0],LKA:[2.36145,2],LSO:[2.94994,2],LTU:[2.13963,2],LUX:[2.93152,2],LVA:[.57172,0],MAR:[3.98841,3],MDA:[1.26222,1],MDG:[.89864,0],MEX:[3.99502,3],MKD:[3.00956,3],MLI:[.67747,0],MMR:[2.13115,2],MNE:[.71517,0],MNG:[3.12844,3],MOZ:[.3705,0],MRT:[2.7279,2],MWI:[.7528,0],MYS:[1.03263,1],
    NAM:[4.1758,4],NER:[3.4713,3],NGA:[.80156,0],NIC:[.21385,0],NLD:[1.58112,1],NOR:[.18837,0],NPL:[3.18229,3],NZL:[.05088,0],OMN:[5,4],PAK:[3.79057,3],PAN:[.74502,0],PER:[3.74322,3],PHL:[2.02628,2],PNG:[0,0],POL:[1.65864,1],PRK:[2.3224,2],PRT:[3.26003,3],PRY:[.00034,0],QAT:[5,4],
    ROU:[1.18801,1],RUS:[1.16759,1],RWA:[0,0],SAU:[4.98081,4],SDN:[1.45796,1],SEN:[2.2201,2],SLE:[0,0],SLV:[1.948,1],SMR:[4.4492,4],SOM:[1.67466,1],SRB:[1.23552,1],SSD:[1.39324,1],SUR:[1.66755,1],SVK:[1.61523,1],SVN:[.52612,0],SWE:[.78129,0],SWZ:[.31385,0],SYR:[4.01347,4],
    TCD:[.85336,0],TGO:[.00324,0],THA:[3.62301,3],TJK:[2.33505,2],TKM:[3.73813,3],TLS:[1.77219,1],TUN:[4.28036,4],TUR:[3.38648,3],TZA:[1.90522,1],UGA:[.19809,0],UKR:[1.3725,1],URY:[1.83298,1],USA:[2.60441,2],UZB:[3.62829,3],VEN:[1.82025,1],VNM:[2.11277,2],YEM:[4.69368,4],ZAF:[4.16775,4],ZMB:[.84557,0],ZWE:[2.17459,2]
  })
});
