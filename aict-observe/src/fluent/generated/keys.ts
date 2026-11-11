import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    'aiux-color-swatch|aict-observe': {
                        table: 'sys_aix_color_swatch'
                        id: '56dd903a7f92d11e29d1cc59e227f1dc'
                    }
                    'aiux-dependency|chart-helpers.js': {
                        table: 'sys_aix_dependency'
                        id: '1187cb884486515a0d2926ba1edeb3a6'
                    }
                    'aiux-dependency|dashboard.js': {
                        table: 'sys_aix_dependency'
                        id: '5ad543b546356bef844a673bc1cd195b'
                    }
                    'aiux-dependency|sr-detail.js': {
                        table: 'sys_aix_dependency'
                        id: 'e6e200b489d5a160898b4c45770eb0d1'
                    }
                    'aiux-experience-page-rel|x-assro-aict-obser-extended-obs-live-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: '7632e275b1a2ad7c0b5068bae049f5e8'
                    }
                    'aiux-experience-page-rel|x-assro-aict-obser-extended-obs-live-sr-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: '5c6f0207ca2984c108c0e9adb2ad25c0'
                    }
                    'aiux-experience-page-rel|x-assro-aict-obser-extended-obs-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: '722ba6a0095faf7add7f0e5251cf6b83'
                    }
                    'aiux-experience-page-rel|x-assro-aict-obser-extended-obs-sr-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: 'da04777a97d45184bd04cb6c62cb46d7'
                    }
                    'aiux-experience-page-rel|x-assro-aict-obser-home-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: 'e9628816c426adf8d2ac4db5f9b3db72'
                    }
                    'aiux-experience-page-rel|x-assro-aict-obser-incidents-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: 'cc09ac1ca8fd097f33f2a59a3bf198fe'
                    }
                    'aiux-experience-prop|appHeadCss': {
                        table: 'sys_aix_experience_properties'
                        id: '5fcb3568e1d7eee25b1a83e660e4cbec'
                    }
                    'aiux-experience-prop|appTailwindCss': {
                        table: 'sys_aix_experience_properties'
                        id: '261e08bfd9f2f8bb451b978a26a23a8e'
                    }
                    'aiux-experience|aict-observe': {
                        table: 'sys_aix_experience'
                        id: '0633f85eeffff593d613769a15981eca'
                    }
                    'aiux-layout-widget|lifecycle': {
                        table: 'sys_aix_widget'
                        id: '331b1d1dfefb3787e644f5d28d46c5a6'
                    }
                    'aiux-m2m-widget-dep|x-assro-aict-obser-extended-obs-live-page|chart-helpers.js': {
                        table: 'sys_aix_m2m_widget_dependency'
                        id: '322a755a303c3a0faf81e3418f5efb5d'
                    }
                    'aiux-m2m-widget-dep|x-assro-aict-obser-extended-obs-live-page|dashboard.js': {
                        table: 'sys_aix_m2m_widget_dependency'
                        id: '1229de8459a944ce6e21055c107388ef'
                    }
                    'aiux-m2m-widget-dep|x-assro-aict-obser-extended-obs-live-sr-page|chart-helpers.js': {
                        table: 'sys_aix_m2m_widget_dependency'
                        id: 'dcc00b64071937192224f6d2f92af44f'
                    }
                    'aiux-m2m-widget-dep|x-assro-aict-obser-extended-obs-live-sr-page|sr-detail.js': {
                        table: 'sys_aix_m2m_widget_dependency'
                        id: 'd88c92c92af3172e28d73ecbc42b6e20'
                    }
                    'aiux-m2m-widget-dep|x-assro-aict-obser-extended-obs-page|chart-helpers.js': {
                        table: 'sys_aix_m2m_widget_dependency'
                        id: '5655b00138aa934022420287f3677b56'
                    }
                    'aiux-m2m-widget-dep|x-assro-aict-obser-extended-obs-page|dashboard.js': {
                        table: 'sys_aix_m2m_widget_dependency'
                        id: 'd11c914241cba86ff6550b353258cf10'
                    }
                    'aiux-m2m-widget-dep|x-assro-aict-obser-extended-obs-sr-page|chart-helpers.js': {
                        table: 'sys_aix_m2m_widget_dependency'
                        id: '726a5bfe174eaddc11456978257fafa9'
                    }
                    'aiux-m2m-widget-dep|x-assro-aict-obser-extended-obs-sr-page|sr-detail.js': {
                        table: 'sys_aix_m2m_widget_dependency'
                        id: '2af97e46f45b2fe85d78936b8d0643a5'
                    }
                    'aiux-page-widget|x-assro-aict-obser-extended-obs-live-page': {
                        table: 'sys_aix_widget'
                        id: '3b5f18847a6031dfd7f3cd5a8594080d'
                    }
                    'aiux-page-widget|x-assro-aict-obser-extended-obs-live-sr-page': {
                        table: 'sys_aix_widget'
                        id: '25e37e95bb5676e95e1a271d10e29823'
                    }
                    'aiux-page-widget|x-assro-aict-obser-extended-obs-page': {
                        table: 'sys_aix_widget'
                        id: 'c18e8be87e506fc1e18e1d8aa9ad2880'
                    }
                    'aiux-page-widget|x-assro-aict-obser-extended-obs-sr-page': {
                        table: 'sys_aix_widget'
                        id: 'b30296327efce9b3927fa322a20828a7'
                    }
                    'aiux-page-widget|x-assro-aict-obser-home-page': {
                        table: 'sys_aix_widget'
                        id: '6d14815034528474856448365fa840b0'
                    }
                    'aiux-page-widget|x-assro-aict-obser-incidents-page': {
                        table: 'sys_aix_widget'
                        id: '2e23abc7c537e159af9d629a2b1c6cd8'
                    }
                    'aiux-page|x-assro-aict-obser-extended-obs-live-page': {
                        table: 'sys_aix_page'
                        id: '9aeea70b456a96662f4db4433362f237'
                    }
                    'aiux-page|x-assro-aict-obser-extended-obs-live-sr-page': {
                        table: 'sys_aix_page'
                        id: '2ffaee75c696ac00a152cbd9713b6555'
                    }
                    'aiux-page|x-assro-aict-obser-extended-obs-page': {
                        table: 'sys_aix_page'
                        id: '2c94d2afd0fe180bdd4ac2fca98cdbe9'
                    }
                    'aiux-page|x-assro-aict-obser-extended-obs-sr-page': {
                        table: 'sys_aix_page'
                        id: '5d4ff3d0d47944466b442e67614d2375'
                    }
                    'aiux-page|x-assro-aict-obser-home-page': {
                        table: 'sys_aix_page'
                        id: 'ffbf1953cc12f322346b277b7d580141'
                    }
                    'aiux-page|x-assro-aict-obser-incidents-page': {
                        table: 'sys_aix_page'
                        id: '9cbcbee4a8b51e2f58465007954de7c9'
                    }
                    'aiux-project|x_assro_aict_obser': {
                        table: 'sys_aix_project'
                        id: 'bb604dc8366ecea91d089810f7508d33'
                    }
                    'aiux-theme|aict-observe': {
                        table: 'sys_aix_theme'
                        id: '4a918d28e8cbc823c3264c91bd2a281c'
                    }
                    'aiux-widget|aiux-hello-world': {
                        table: 'sys_aix_widget'
                        id: 'c2b8f12504bc1e49ffca2152f385e69a'
                    }
                    bom_json: {
                        table: 'sys_module'
                        id: '2f4571eb791b4c2baf600798882107d0'
                    }
                    'observability-api': {
                        table: 'sys_ws_definition'
                        id: '064af891a2374716bf81d3095f71dc0a'
                    }
                    'observability-api-trends': {
                        table: 'sys_ws_operation'
                        id: 'd38ff084015146abad6b3285782436af'
                    }
                    'observability-api-trends-count': {
                        table: 'sys_ws_query_parameter'
                        id: '99ebad02380a4cc29a0c3b100e436851'
                    }
                    'observability-api-trends-hours': {
                        table: 'sys_ws_query_parameter'
                        id: '6dadf8b2f3e44186bfba353a3769e76f'
                    }
                    'observability-api-trends-start': {
                        table: 'sys_ws_query_parameter'
                        id: '55ad293888cb4b219c96c099d8f0e8b9'
                    }
                    'observability-api-trends-step': {
                        table: 'sys_ws_query_parameter'
                        id: 'd2b07ebfc9db4f31923eaff9bef1bd22'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: '8bcbc504c73346ada395117ab72b99e1'
                    }
                    'src_server_observability-trends_js': {
                        table: 'sys_module'
                        id: '9561a0b7672248dba74a13620c0a2786'
                    }
                }
                composite: [
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: '03d5d34ef3234afaa37c1370d84f3659'
                        key: {
                            web_service_operation: 'd38ff084015146abad6b3285782436af'
                            web_service_query_parameter: '55ad293888cb4b219c96c099d8f0e8b9'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: '287e020de5d54409991b996608dbfccc'
                        key: {
                            web_service_operation: 'd38ff084015146abad6b3285782436af'
                            web_service_query_parameter: '6dadf8b2f3e44186bfba353a3769e76f'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact'
                        id: '4f130300369c4a51b2f71cbd90e4baad'
                        key: {
                            name: 'aiux-source bb604dc8366ecea91d089810f7508d33'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: '9b243ff0d9af464e94e28b56c19cf045'
                        key: {
                            web_service_operation: 'd38ff084015146abad6b3285782436af'
                            web_service_query_parameter: '99ebad02380a4cc29a0c3b100e436851'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: 'a61ec55cf090499482b2f806e3a04009'
                        key: {
                            web_service_operation: 'd38ff084015146abad6b3285782436af'
                            web_service_query_parameter: 'd2b07ebfc9db4f31923eaff9bef1bd22'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'cd76fc80d0c549dd8d037581a978806c'
                        key: {
                            application_file: 'bb604dc8366ecea91d089810f7508d33'
                            source_artifact: '4f130300369c4a51b2f71cbd90e4baad'
                        }
                    },
                ]
            }
        }
    }
}
