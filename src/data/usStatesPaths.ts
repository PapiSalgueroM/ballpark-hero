// US state SVG paths — Albers USA projection, viewBox "0 0 960 600"
// Each entry: state abbreviation, SVG path 'd', label center [cx, cy], full name

export interface USState {
  id: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
}

export const US_STATES: USState[] = [
  // Alabama
  { id: 'AL', name: 'Alabama', labelX: 682, labelY: 419,
    path: 'M663,368 L683,368 696,369 697,432 694,446 690,452 684,451 680,458 668,456 660,455 660,395 663,368Z' },
  // Alaska (inset)
  { id: 'AK', name: 'Alaska', labelX: 158, labelY: 538,
    path: 'M120,510 L128,505 140,503 152,508 162,505 175,510 185,515 190,525 188,535 180,542 170,548 155,552 140,555 125,550 115,540 112,528 115,518Z' },
  // Arizona
  { id: 'AZ', name: 'Arizona', labelX: 215, labelY: 420,
    path: 'M185,370 L240,370 250,373 255,460 195,460 182,430 180,400Z' },
  // Arkansas
  { id: 'AR', name: 'Arkansas', labelX: 577, labelY: 408,
    path: 'M556,383 L600,383 605,386 600,430 558,430 553,395Z' },
  // California
  { id: 'CA', name: 'California', labelX: 115, labelY: 365,
    path: 'M92,280 L108,275 118,290 130,310 140,335 145,355 148,375 145,400 140,430 130,445 115,448 100,440 88,420 82,395 80,370 82,345 85,320 88,300Z' },
  // Colorado
  { id: 'CO', name: 'Colorado', labelX: 307, labelY: 340,
    path: 'M270,310 L345,310 345,370 270,370Z' },
  // Connecticut
  { id: 'CT', name: 'Connecticut', labelX: 852, labelY: 232,
    path: 'M841,218 L858,213 863,218 860,235 852,240 840,238 838,228Z' },
  // Delaware
  { id: 'DE', name: 'Delaware', labelX: 832, labelY: 298,
    path: 'M824,280 L834,278 838,285 836,300 830,308 824,300Z' },
  // Florida
  { id: 'FL', name: 'Florida', labelX: 735, labelY: 498,
    path: 'M698,452 L750,448 765,455 770,470 760,495 745,515 730,530 718,535 712,525 715,505 720,485 710,470 700,458Z' },
  // Georgia
  { id: 'GA', name: 'Georgia', labelX: 717, labelY: 420,
    path: 'M698,370 L740,370 745,385 740,430 730,450 700,452 695,445 697,405 698,370Z' },
  // Hawaii (inset)
  { id: 'HI', name: 'Hawaii', labelX: 260, labelY: 545,
    path: 'M240,530 L248,527 255,530 262,535 265,542 260,550 252,555 243,552 238,545 237,537Z' },
  // Idaho
  { id: 'ID', name: 'Idaho', labelX: 195, labelY: 250,
    path: 'M185,185 L210,183 218,195 215,220 220,245 215,275 210,290 190,295 180,280 178,255 180,230 182,205Z' },
  // Illinois
  { id: 'IL', name: 'Illinois', labelX: 605, labelY: 318,
    path: 'M595,260 L620,260 622,270 618,310 615,340 610,365 600,372 590,370 588,340 590,310 592,280Z' },
  // Indiana
  { id: 'IN', name: 'Indiana', labelX: 642, labelY: 318,
    path: 'M625,270 L650,268 653,280 650,320 648,355 640,368 625,365 622,340 622,310 624,280Z' },
  // Iowa
  { id: 'IA', name: 'Iowa', labelX: 535, labelY: 275,
    path: 'M510,255 L560,252 568,258 565,290 555,300 515,303 508,295 508,270Z' },
  // Kansas
  { id: 'KS', name: 'Kansas', labelX: 437, labelY: 360,
    path: 'M395,340 L480,340 483,345 480,380 395,383 392,375Z' },
  // Kentucky
  { id: 'KY', name: 'Kentucky', labelX: 680, labelY: 352,
    path: 'M635,340 L720,335 728,345 720,365 640,368 632,358Z' },
  // Louisiana
  { id: 'LA', name: 'Louisiana', labelX: 582, labelY: 470,
    path: 'M558,435 L600,432 605,440 610,460 605,478 592,488 575,490 565,480 558,465Z' },
  // Maine
  { id: 'ME', name: 'Maine', labelX: 890, labelY: 155,
    path: 'M873,120 L888,115 898,125 900,145 895,168 885,180 873,178 868,165 865,145 868,130Z' },
  // Maryland
  { id: 'MD', name: 'Maryland', labelX: 810, labelY: 300,
    path: 'M778,288 L822,280 828,285 825,300 818,308 790,310 780,305Z' },
  // Massachusetts
  { id: 'MA', name: 'Massachusetts', labelX: 870, labelY: 213,
    path: 'M843,205 L875,200 885,205 888,212 878,218 858,220 842,218Z' },
  // Michigan
  { id: 'MI', name: 'Michigan', labelX: 652, labelY: 240,
    path: 'M625,200 L635,195 648,198 660,210 665,230 662,255 655,268 640,270 628,268 620,255 618,240 620,220Z' },
  // Minnesota
  { id: 'MN', name: 'Minnesota', labelX: 520, labelY: 210,
    path: 'M505,165 L540,162 548,170 548,210 540,245 530,255 510,258 502,248 500,220 502,195 505,175Z' },
  // Mississippi
  { id: 'MS', name: 'Mississippi', labelX: 625, labelY: 428,
    path: 'M610,383 L640,380 645,390 640,440 635,460 618,460 610,450 608,420Z' },
  // Missouri
  { id: 'MO', name: 'Missouri', labelX: 555, labelY: 348,
    path: 'M520,305 L570,300 580,308 578,350 575,385 556,383 540,380 530,365 525,340 520,315Z' },
  // Montana
  { id: 'MT', name: 'Montana', labelX: 275, labelY: 195,
    path: 'M220,170 L330,168 335,175 332,215 225,218 218,210 218,195Z' },
  // Nebraska
  { id: 'NE', name: 'Nebraska', labelX: 415, labelY: 298,
    path: 'M370,278 L460,275 468,282 465,308 460,318 395,320 375,315 368,305 368,288Z' },
  // Nevada
  { id: 'NV', name: 'Nevada', labelX: 165, labelY: 330,
    path: 'M148,270 L180,265 188,275 185,370 150,375 142,360 140,330 142,300Z' },
  // New Hampshire
  { id: 'NH', name: 'New Hampshire', labelX: 875, labelY: 192,
    path: 'M868,172 L878,170 882,178 880,200 875,208 865,205 862,195 865,180Z' },
  // New Jersey
  { id: 'NJ', name: 'New Jersey', labelX: 840, labelY: 270,
    path: 'M830,248 L840,245 845,252 842,275 838,290 830,295 826,285 828,265Z' },
  // New Mexico
  { id: 'NM', name: 'New Mexico', labelX: 278, labelY: 420,
    path: 'M250,375 L310,373 315,378 312,460 252,462 248,450 248,400Z' },
  // New York
  { id: 'NY', name: 'New York', labelX: 828, labelY: 222,
    path: 'M790,195 L835,190 842,198 845,215 840,238 830,248 818,252 800,250 790,240 785,225 788,210Z' },
  // North Carolina
  { id: 'NC', name: 'NC', labelX: 765, labelY: 375,
    path: 'M725,355 L800,350 810,358 805,375 780,385 730,388 720,380 722,365Z' },
  // North Dakota
  { id: 'ND', name: 'North Dakota', labelX: 425, labelY: 195,
    path: 'M390,175 L460,173 465,180 462,215 392,218 388,210 388,190Z' },
  // Ohio
  { id: 'OH', name: 'Ohio', labelX: 690, labelY: 295,
    path: 'M660,265 L700,260 710,268 708,305 700,335 685,340 665,340 658,330 655,300 658,278Z' },
  // Oklahoma
  { id: 'OK', name: 'Oklahoma', labelX: 440, labelY: 400,
    path: 'M395,385 L480,383 490,388 490,415 485,425 400,428 395,420Z' },
  // Oregon
  { id: 'OR', name: 'Oregon', labelX: 130, labelY: 230,
    path: 'M82,195 L145,190 155,198 152,235 148,265 135,270 100,272 85,260 78,240 78,215Z' },
  // Pennsylvania
  { id: 'PA', name: 'Pennsylvania', labelX: 798, labelY: 260,
    path: 'M760,245 L825,240 832,248 828,270 820,280 762,285 755,275 758,258Z' },
  // Rhode Island
  { id: 'RI', name: 'Rhode Island', labelX: 865, labelY: 230,
    path: 'M860,222 L868,220 870,228 867,236 860,238 858,230Z' },
  // South Carolina
  { id: 'SC', name: 'South Carolina', labelX: 745, labelY: 400,
    path: 'M720,380 L760,375 770,382 765,405 750,418 730,420 715,412 715,395Z' },
  // South Dakota
  { id: 'SD', name: 'South Dakota', labelX: 425, labelY: 240,
    path: 'M390,220 L462,218 468,225 465,262 460,275 392,278 388,268 388,240Z' },
  // Tennessee
  { id: 'TN', name: 'Tennessee', labelX: 680, labelY: 380,
    path: 'M630,368 L725,362 732,370 728,390 640,395 632,385Z' },
  // Texas
  { id: 'TX', name: 'Texas', labelX: 430, labelY: 468,
    path: 'M350,420 L398,418 400,425 490,420 495,430 500,460 490,490 475,510 455,520 435,525 415,518 395,505 380,490 365,475 355,455 348,435Z' },
  // Utah
  { id: 'UT', name: 'Utah', labelX: 225, labelY: 335,
    path: 'M195,290 L255,288 260,295 258,370 240,373 195,375 190,365 192,310Z' },
  // Vermont
  { id: 'VT', name: 'Vermont', labelX: 858, labelY: 192,
    path: 'M852,175 L862,173 866,180 864,200 858,208 850,205 848,195 850,182Z' },
  // Virginia
  { id: 'VA', name: 'Virginia', labelX: 780, labelY: 330,
    path: 'M740,315 L810,310 818,318 812,340 800,355 740,358 732,348 735,330Z' },
  // Washington
  { id: 'WA', name: 'Washington', labelX: 130, labelY: 180,
    path: 'M82,150 L150,145 160,155 158,185 145,195 100,198 82,195 78,175Z' },
  // West Virginia
  { id: 'WV', name: 'West Virginia', labelX: 755, labelY: 320,
    path: 'M735,295 L762,290 770,298 768,322 758,340 742,345 735,335 732,315Z' },
  // Wisconsin
  { id: 'WI', name: 'Wisconsin', labelX: 580, labelY: 225,
    path: 'M560,185 L595,182 602,192 600,230 595,258 580,262 562,260 555,248 555,225 558,200Z' },
  // Wyoming
  { id: 'WY', name: 'Wyoming', labelX: 282, labelY: 260,
    path: 'M240,228 L325,225 330,232 328,285 242,288 238,278 238,248Z' },
  // Iowa — already included above
];
