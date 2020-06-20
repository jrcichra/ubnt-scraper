CREATE TABLE `ubnt` (
  `id` bigint(20) AUTO_INCREMENT,
  `date` datetime DEFAULT CURRENT_TIMESTAMP,
`model` varchar(255),
`name` varchar(255),
`mode` varchar(255),
`ssid` varchar(255),
`security` varchar(255),
`version` varchar(255),
`uptime` varchar(255),
`channel` int,
`frequency` int,
`frequency_start` int,
`frequency_stop` int,
`distance` float,
`chains` varchar(255),
`txpower` float,
`antenna` varchar(255),
`wlan0_mac` varchar(255),
`lan0_mac` varchar(255),
`lan0_link` float,
`ap_mac` varchar(255),
`signal_strength` float,
`signal_horizontal` float,
`signal_vertical` float,
`noise_floor` float,
`ccq` float,
`txrate` float,
`rxrate` float,
`airmax` varchar(255),
`airselect` varchar(255),
`priority` varchar(255),
`quality` float,
`capacity` float,
`wlan0_rx` float,
`wlan0_tx` float,
`connections` float,
  PRIMARY KEY (`id`)
) ;