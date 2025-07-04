const { Client, GatewayIntentBits, Events } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  NoSubscriberBehavior,
  StreamType,
} = require('@discordjs/voice');

const prism = require('prism-media');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const TOKEN = process.env.TOKEN;
const RADIO_URL = 'https://hts03.brascast.com:7702/live';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Cruzeiro Bot online como ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === '!radio') {
    const canal = message.member.voice.channel;
    if (!canal) return message.reply('❌ Entre em um canal de voz primeiro.');

    const connection = joinVoiceChannel({
      channelId: canal.id,
      guildId: canal.guild.id,
      adapterCreator: canal.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });

    const ffmpegArgs = [
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-i', RADIO_URL,
      '-vn',
      '-acodec', 'libopus',
      '-f', 'opus',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ];

    const stream = new prism.FFmpeg({
      ffmpegPath,
      args: ffmpegArgs,
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Opus,
      inlineVolume: true,
    });
    resource.volume.setVolume(0.5);

    player.play(resource);
    connection.subscribe(player);

    player.on('error', error => {
      console.error('Erro no player:', error.message);
      message.channel.send('⚠️ Erro ao tentar tocar a rádio.');
    });

    connection.on('error', error => {
      console.error('Erro na conexão:', error.message);
    });

    message.reply('📻 Tocando sua rádio ao vivo!');
  }

  if (message.content === '!sair') {
    const connection = getVoiceConnection(message.guild.id);
    if (connection) {
      connection.destroy();
      message.reply('👋 Saí do canal de voz.');
    } else {
      message.reply('❌ Não estou conectado a nenhum canal.');
    }
  }
});

client.login(TOKEN);